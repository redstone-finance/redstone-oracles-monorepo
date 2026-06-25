import { ContentTypes, getSerializerDeserializer } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  connect,
  DebugEvents,
  Events,
  Msg,
  NatsConnection,
  NatsError,
  headers as natsHeaders,
  nkeyAuthenticator,
  Subscription,
} from "nats";
import { deserializeAndDispatch } from "./deserialize-incoming-message";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";

const CONTENT_TYPE_HEADER = "Content-Type";
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 200;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 60_000;

/** Translates an MQTT-style topic to a NATS subject: / → . , + → * , # → > */
const MQTT_TO_NATS: Record<string, string> = {
  "+": "*",
  "#": ">",
};

export function mqttTopicToNatsSubject(topic: string): string {
  return topic
    .split("/")
    .map((token) => MQTT_TO_NATS[token] ?? token)
    .join(".");
}

export function natsSubjectToMqttTopic(subject: string): string {
  return subject.split(".").join("/");
}

export interface NatsClientConfig {
  /** NATS server host, e.g. "localhost:4222" or "nats://localhost:4222" */
  host: string;
  connectionTimeoutMs?: number;
  /** Base delay in ms for exponential backoff on reconnect. Defaults to 200ms. */
  reconnectBaseDelayMs?: number;
  /** Maximum delay in ms for exponential backoff on reconnect. Defaults to 60000ms. */
  reconnectMaxDelayMs?: number;
  /** NKey seed string (e.g. "SUAMLK..."). If omitted, connects without authentication. */
  nkeySeed?: string;
  /** PEM-encoded CA certificate. When set, connects via TLS and verifies server cert against this CA. */
  caCert?: string;
  /** PEM-encoded client certificate for mTLS. Requires clientKey. */
  clientCert?: string;
  /** PEM-encoded client private key for mTLS. Requires clientCert. */
  clientKey?: string;
}

export class NatsClient implements PubSubClient {
  private readonly logger = loggerFactory("nats-client");
  private nc?: NatsConnection;
  private connecting?: Promise<NatsConnection>;
  private readonly subscriptions = new Map<string, Subscription>();
  private onMessageCallback?: SubscribeCallback;
  private reconnectAttempts = 0;

  constructor(private readonly config: NatsClientConfig) {}

  getUniqueName(): string {
    return `nats::${this.config.host}`;
  }

  private getNatsUrl(): string {
    const { host } = this.config;
    if (host.startsWith("nats://") || host.startsWith("tls://")) {
      return host;
    }

    return this.config.caCert ? `tls://${host}` : `nats://${host}`;
  }

  private async getConnection(): Promise<NatsConnection> {
    if (this.nc) {
      return this.nc;
    }
    if (!this.connecting) {
      // guard against multiple connections in Promise.all pattern
      const baseDelay = this.config.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS;
      const maxDelay = this.config.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS;
      this.connecting = connect({
        // When you pass multiple servers to connect, the NATS client
        // connects to exactly one at a time and uses the others as
        // failover targets. It reconnects to the next server in the list if the current one disconnects.
        servers: this.getNatsUrl(),
        timeout: this.config.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS,
        reconnectDelayHandler: () => {
          const attempt = this.reconnectAttempts;
          const cap = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
          const delay = Math.random() * cap;
          this.reconnectAttempts++;
          if (attempt > 0) {
            this.logger.warn("NATS reconnect scheduling next attempt", {
              host: this.config.host,
              attempt: attempt + 1,
              nextDelayMs: Math.round(delay),
            });
          }

          return delay;
        },
        // into infinity — both for reconnects and the initial connect
        maxReconnectAttempts: -1,
        waitOnFirstConnect: true,
        authenticator: this.config.nkeySeed
          ? nkeyAuthenticator(new TextEncoder().encode(this.config.nkeySeed))
          : undefined,
        // nats.js auto-upgrades to TLS whenever the server reply with tls_available:true,
        // unless tls is explicitly set to null. Without caCert we pass null to force plain connection
        tls: this.config.caCert
          ? {
              ca: this.config.caCert,
              cert: this.config.clientCert,
              key: this.config.clientKey,
              handshakeFirst: true,
            }
          : null,
      })
        .then((nc) => {
          this.nc = nc;
          this.reconnectAttempts = 0;
          this.logger.info("Connected to NATS", { host: this.config.host });
          this.watchStatus(nc);

          return nc;
        })
        .catch((e) => {
          // unreachable with waitOnFirstConnect:true + maxReconnectAttempts:-1
          this.connecting = undefined;
          this.reconnectAttempts = 0;
          this.logger.error("Failed to connect to NATS", {
            host: this.config.host,
            error: RedstoneCommon.stringifyError(e),
          });

          throw e;
        });
    }

    return await this.connecting;
  }

  /** We don't wait for ACK from server */
  async publish(payloads: PubSubPayload[], contentType: ContentTypes) {
    const nc = await this.getConnection();
    const serializer = getSerializerDeserializer(contentType);
    for (const payload of payloads) {
      const encodedMessage = serializer.serialize(payload.data);
      const hdrs = natsHeaders();
      hdrs.set(CONTENT_TYPE_HEADER, contentType);
      nc.publish(mqttTopicToNatsSubject(payload.topic), encodedMessage, { headers: hdrs });
    }
  }

  setOnMessageHandler(onMessage: SubscribeCallback) {
    this.onMessageCallback = onMessage;
  }

  async subscribe(topics: string[]) {
    const nc = await this.getConnection();
    for (const topic of topics) {
      if (this.subscriptions.has(topic)) {
        continue;
      }

      const callback = (err: NatsError | null, msg: Msg) => {
        if (err) {
          this.onMessageCallback?.(topic, null, err.message, this);

          return;
        }
        const contentType = msg.headers?.get(CONTENT_TYPE_HEADER) as ContentTypes | undefined;
        deserializeAndDispatch(
          natsSubjectToMqttTopic(msg.subject),
          contentType,
          Buffer.from(msg.data),
          this.onMessageCallback,
          this
        );
      };

      const sub = nc.subscribe(mqttTopicToNatsSubject(topic), {
        callback,
      });
      this.subscriptions.set(topic, sub);
      this.logger.debug("Subscribed to NATS topic", { topic });
    }
    await nc.flush();
  }

  async unsubscribe(topics: string[]) {
    for (const topic of topics) {
      const sub = this.subscriptions.get(topic);
      if (sub) {
        sub.unsubscribe();
        this.subscriptions.delete(topic);
        this.logger.debug("Unsubscribed from NATS topic", { topic });
      }
    }
    await this.nc?.flush();
  }

  stop() {
    void this.nc?.drain();
  }

  private watchStatus(nc: NatsConnection) {
    const host = this.config.host;
    void (async () => {
      for await (const status of nc.status()) {
        const ctx = { host, data: status.data };
        switch (status.type) {
          case Events.Disconnect:
            this.logger.warn("NATS disconnected", ctx);
            break;
          case Events.Reconnect:
            this.reconnectAttempts = 0;
            this.logger.info("NATS reconnected", ctx);
            break;
          case Events.Update:
            this.logger.info("NATS cluster updated", ctx);
            break;
          case Events.LDM:
            this.logger.warn("NATS server entering lame-duck mode", ctx);
            break;
          case Events.Error:
            this.logger.error("NATS async error", ctx);
            break;
          case DebugEvents.Reconnecting:
            this.logger.info("NATS reconnecting...", ctx);
            break;
          case DebugEvents.StaleConnection:
            this.logger.warn("NATS stale connection detected", ctx);
            break;
          case DebugEvents.ClientInitiatedReconnect:
            this.logger.info("NATS client initiated reconnect", ctx);
            break;
          case DebugEvents.PingTimer:
            this.logger.debug("NATS ping timer", ctx);
            break;
        }
      }
    })();
  }
}
