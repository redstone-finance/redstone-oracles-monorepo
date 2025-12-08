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
  private initialTopics: Set<string> = new Set();
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

  start() {
    this.logger.info("Starting SSE connection");
    this.connect();
  }

  private connect() {
    this.initialTopics = new Set(this.topics);
    const initialTopics = Array.from(this.initialTopics.keys());
    const query = initialTopics.length > 0 ? `?topics=${initialTopics.join(",")}` : "";
    const url = this.common.getUrl(`${SUBSCRIBE_SSE_ROUTE}${query}`);

    this.logger.info("Establishing SSE connection", { url, topicCount: initialTopics.length });

    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener(CONNECTED_EVENT, (e) => this.handleConnected(e));
    this.eventSource.addEventListener(BATCH_EVENT, (e) => this.handleBatch(e));
    this.eventSource.onerror = (event) =>
      this.logger.info("SSE connection error", {
        event,
        state: this.eventSource?.readyState,
      });
  }

  private handleConnected(event: MessageEvent) {
    this.logger.info("Received connected event");

    try {
      const data = JSON.parse(event.data as string) as ConnectedEvent;
      this.sessionId = data.session_id;

      this.logger.info("Connected to stream", {
        sessionId: this.sessionId,
        topics: Array.from(this.initialTopics.keys()),
      });

      const topics = this.topics;
      this.topics = new Set(this.initialTopics);
      if (this.callback !== undefined) {
        this.logger.info("Resubscribing to topics after reconnection", {
          topicCount: topics.size,
        });
        void this.subscribe(Array.from(topics.keys()), this.callback);
      }

      const unsubscribedTopics = new Set(this.initialTopics);
      for (const topic of topics) {
        unsubscribedTopics.delete(topic);
      }
      if (unsubscribedTopics.size > 0) {
        this.logger.info("Cleaning up stale topics", {
          topics: Array.from(unsubscribedTopics.keys()),
        });
      }
      void this.unsubscribe(Array.from(unsubscribedTopics.keys()));
    } catch (error) {
      this.logger.info("Failed to parse connected event", { error });
    }
  }

  private handleBatch(event: MessageEvent) {
    let batch: PackageBatch;

    try {
      batch = JSON.parse(event.data as string) as PackageBatch;
      this.logger.info("Received batch event", { packageCount: batch.length });
    } catch (error) {
      this.logger.info("Failed to parse batch event", { error });

      return;
    }

    for (const update of batch) {
      this.processUpdate(update);
    }
  }

  private processUpdate(update: Package) {
    if (!this.callback) {
      this.logger.info("Received update but no callback registered", { topic: update.topic });

      return;
    }

    let data: unknown;

    try {
      data = this.common.deserializeData(update.data);
      this.logger.info("Processing update", { topic: update.topic, dataSize: update.data.length });
    } catch (e) {
      this.logger.error("Failed to deserialize update", {
        topic: update.topic,
        error: RedstoneCommon.stringifyError(e),
      });
      this.callback(
        update.topic,
        null,
        `Error occurred when tried to parse message and call callback, error=${RedstoneCommon.stringifyError(e)}`,
        this
      );

      return;
    }

    this.callback(update.topic, data, null, this);
  }

  async publish(payloads: PubSubPayload[]) {
    return await this.common.publish(payloads);
  }

  async subscribe(topics: string[], onMessage: SubscribeCallback) {
    this.logger.info("Subscribe requested", { topics, hasSession: !!this.sessionId });
    this.callback = onMessage;

    const newTopics: string[] = [];

    for (const topic of topics) {
      if (!this.topics.has(topic)) {
        newTopics.push(topic);
      }
      this.topics.add(topic);
    }

    if (!this.sessionId) {
      this.logger.info("No active session, initiating connection");

      return this.connect();
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
          `Subscription failed for topics=${topics.join(", ")} error=${RedstoneCommon.stringifyError(e)}`
        );
      }
    } else {
      this.logger.info("No new topics to subscribe", { requestedTopics: topics });
    }
  }

  async unsubscribe(topics: string[]) {
    this.logger.info("Unsubscribe requested", { topics });

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
      this.logger.info("No topics to unsubscribe", { requestedTopics: topics });
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
