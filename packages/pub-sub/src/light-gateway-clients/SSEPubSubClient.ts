import { httpClient as defaultHttpClient, HttpClient } from "@redstone-finance/http-client";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { EventSource } from "eventsource";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "../PubSubClient";
import { ClientCommon } from "./ClientCommon";
import {
  SUBSCRIBE_SSE_ROUTE,
  SUBSCRIBE_TO_TOPICS_ROUTE,
  UNSUBSCRIBE_FROM_TOPICS_ROUTE,
} from "./routes";

const CONNECTED_EVENT = "connected";
const PACKAGE_EVENT = "package";
const BATCH_EVENT = "batch";
const CONTENT_TYPE_JSON = "application/json";

type ConnectedEvent = {
  session_id: string;
};

type Package = {
  topic: string;
  data: string;
};

type PackageBatch = Package[];

export class SSEPubSubClient implements PubSubClient {
  private readonly logger = loggerFactory("sse-pub-sub-client");
  private topics: Set<string> = new Set();
  private readonly httpClient: HttpClient;
  private readonly common: ClientCommon;

  private eventSource?: EventSource;
  private sessionId?: string;
  private callback?: SubscribeCallback;

  constructor(lightGatewayAddress: string, httpClient?: HttpClient) {
    this.httpClient = httpClient ?? defaultHttpClient;
    this.common = new ClientCommon(this.httpClient, lightGatewayAddress, this.logger);
    this.logger.info("SSEPubSubClient initialized", {
      lightGatewayAddress: this.common.lightGatewayAddress,
    });
  }

  async start() {
    this.logger.info("Starting SSE connection");
    await this.connect();
  }

  private async connect() {
    const version = await this.common.getGatewayVersion();

    if (version === "v1") {
      this.connectV1();
    } else {
      this.connectLegacy();
    }
  }

  private connectV1() {
    const url = this.common.getUrl(SUBSCRIBE_SSE_ROUTE);

    this.logger.info("Establishing SSE connection", {
      url,
      topicCount: this.topics.size,
      version: "v1",
    });

    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener(CONNECTED_EVENT, (e) => this.handleConnected(e));
    this.eventSource.addEventListener(PACKAGE_EVENT, (e) => this.handlePackage(e));
    this.eventSource.onerror = (event) =>
      this.logger.info("SSE connection error", { event, state: this.eventSource?.readyState });
  }

  private connectLegacy() {
    const url = this.common.getUrl(SUBSCRIBE_SSE_ROUTE);

    this.logger.info("Establishing SSE connection", {
      url,
      topicCount: this.topics.size,
      version: "legacy",
    });

    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener(CONNECTED_EVENT, (e) => this.handleConnected(e));
    this.eventSource.addEventListener(BATCH_EVENT, (e) => this.handleBatch(e));
    this.eventSource.onerror = (event) =>
      this.logger.info("SSE connection error", { event, state: this.eventSource?.readyState });
  }

  private handleConnected(event: MessageEvent) {
    this.logger.debug("Received connected event");

    try {
      const data = JSON.parse(event.data as string) as ConnectedEvent;
      this.sessionId = data.session_id;

      this.logger.info("Connected to stream", { sessionId: this.sessionId });

      const topicsToSubscribe = Array.from(this.topics.keys());
      this.topics = new Set();
      void this.subscribe(topicsToSubscribe).catch((e) =>
        this.logger.error(`Subscribe failed: ${RedstoneCommon.stringifyError(e)}`)
      );
    } catch (error) {
      this.logger.info("Failed to parse connected event", { error });
    }
  }

  private handlePackage(event: MessageEvent) {
    this.processUpdate(event.lastEventId, event.data as string);
  }

  private handleBatch(event: MessageEvent) {
    let batch: PackageBatch;

    try {
      batch = JSON.parse(event.data as string) as PackageBatch;
      this.logger.debug("Received batch event", { packageCount: batch.length });
    } catch (error) {
      this.logger.info("Failed to parse batch event", { error });

      return;
    }

    for (const update of batch) {
      this.processUpdate(update.topic, update.data);
    }
  }

  private processUpdate(topic: string, rawData: string) {
    if (!this.callback) {
      this.logger.info("Received update but no callback registered", { topic });

      return;
    }

    let data: unknown;

    try {
      data = this.common.deserializeData(rawData);
    } catch (e) {
      this.logger.error("Failed to deserialize update", {
        topic,
        error: RedstoneCommon.stringifyError(e),
      });
      this.callback(
        topic,
        null,
        `Error occurred when tried to parse message and call callback, error=${RedstoneCommon.stringifyError(e)}`,
        this
      );

      return;
    }

    this.callback(topic, data, null, this);
  }

  async publish(payloads: PubSubPayload[]) {
    return await this.common.publish(payloads);
  }

  setOnMessageHandler(onMessage: SubscribeCallback) {
    this.callback = onMessage;
  }

  async subscribe(topics: string[]) {
    this.logger.debug("Subscribe requested", { topics, hasSession: !!this.sessionId });

    const newTopics: string[] = [];

    for (const topic of topics) {
      if (!this.topics.has(topic)) {
        newTopics.push(topic);
      }
      this.topics.add(topic);
    }

    if (!this.sessionId) {
      this.logger.info("No active session, initiating connection");
      await this.connect();

      return;
    }

    if (this.sessionId && newTopics.length > 0) {
      this.logger.info("Subscribing to new topics", {
        sessionId: this.sessionId,
        topics: newTopics,
      });

      try {
        await this.httpClient.post(
          this.common.getUrl(SUBSCRIBE_TO_TOPICS_ROUTE),
          { session_id: this.sessionId, topics: newTopics },
          { headers: { "Content-Type": CONTENT_TYPE_JSON } }
        );

        this.logger.info("Subscribed to topics successfully", { topics: newTopics });
      } catch (e) {
        this.logger.error("Subscription failed, rolling back", {
          topics: newTopics,
          error: RedstoneCommon.stringifyError(e),
        });

        await this.unsubscribe(topics).catch((error) =>
          this.logger.error(RedstoneCommon.stringifyError(error))
        );

        throw new Error(
          `Subscription failed for topics=${topics.join(", ")} error=${RedstoneCommon.stringifyError(e)}`,
          { cause: e }
        );
      }
    } else {
      this.logger.debug("No new topics to subscribe", { requestedTopics: topics });
    }
  }

  async unsubscribe(topics: string[]) {
    this.logger.debug("Unsubscribe requested", { topics });

    const removedTopics: string[] = [];

    for (const topic of topics) {
      if (this.topics.delete(topic)) {
        removedTopics.push(topic);
      }
    }

    if (this.sessionId && removedTopics.length > 0) {
      this.logger.info("Unsubscribing from topics", {
        sessionId: this.sessionId,
        topics: removedTopics,
      });

      try {
        await this.httpClient.post(
          this.common.getUrl(UNSUBSCRIBE_FROM_TOPICS_ROUTE),
          { session_id: this.sessionId, topics: removedTopics },
          { headers: { "Content-Type": "application/json" } }
        );

        this.logger.info("Unsubscribed from topics successfully", { topics: removedTopics });
      } catch (e) {
        this.logger.error("Unsubscribe failed", {
          topics: removedTopics,
          error: RedstoneCommon.stringifyError(e),
        });

        throw e;
      }
    } else if (removedTopics.length === 0) {
      this.logger.debug("No topics to unsubscribe", { requestedTopics: topics });
    }
  }

  getUniqueName() {
    return `sse-client::${this.common.lightGatewayAddress}`;
  }

  async beNiceToServer() {
    const topicsToUnsubscribe = Array.from(this.topics.keys());
    if (topicsToUnsubscribe.length > 0) {
      this.logger.info("Cleaning up server-side subscriptions", {
        topicCount: topicsToUnsubscribe.length,
      });
      await this.unsubscribe(topicsToUnsubscribe);
    }
  }

  stop() {
    this.logger.info("Stopping SSE client", {
      sessionId: this.sessionId,
      activeTopics: this.topics.size,
    });

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      this.sessionId = undefined;

      this.logger.info("Stopped SSE stream");
    }

    void this.beNiceToServer();
  }
}
