import { encode } from "@msgpack/msgpack";
import { httpClient as defaultHttpClient, HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { EventSource } from "eventsource";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";

const POST_DATA_ROUTE = "post-data-batch";
const SUBSCRIBE_SEE_ROUTE = "subscribe_sse_stream";
const SUBSCRIBE_TO_TOPICS_ROUTE = "subscribe_to_topics";
const UNSUBSCRIBE_FROM_TOPICS_ROUTE = "unsubscribe_from_topics";
const CONNECTED_EVENT = "connected";
const BATCH_EVENT = "batch";

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
  private readonly topics: Set<string> = new Set();
  private readonly httpClient: HttpClient;
  private readonly serializerDeserializer: DeflateJson = new DeflateJson();

  private eventSource?: EventSource;
  private sessionId?: string;
  private callback?: SubscribeCallback;

  constructor(
    private readonly lightGatewayAddress: string,
    httpClient?: HttpClient
  ) {
    this.httpClient = httpClient ?? defaultHttpClient;
  }

  start() {
    this.connect();
  }

  private connect() {
    const initialTopics = Array.from(this.topics.keys());
    const query = initialTopics.length > 0 ? `?topics=${initialTopics.join(",")}` : "";

    this.eventSource = new EventSource(
      `${this.lightGatewayAddress}/${SUBSCRIBE_SEE_ROUTE}${query}`
    );
    this.eventSource.addEventListener(CONNECTED_EVENT, (e) => this.handleConnected(e));
    this.eventSource.addEventListener(BATCH_EVENT, (e) => this.handleBatch(e));
    this.eventSource.onerror = (event) =>
      this.logger.log("SSE connection error", {
        event,
        state: this.eventSource?.readyState,
      });
  }

  private handleConnected(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data as string) as ConnectedEvent;
      this.sessionId = data.session_id;

      this.logger.log("Connected to stream", {
        sessionId: this.sessionId,
        topics: Array.from(this.topics.keys()),
      });
    } catch (error) {
      this.logger.log("Failed to parse connected event", { error });
    }
  }

  private handleBatch(event: MessageEvent) {
    let batch: PackageBatch;

    try {
      batch = JSON.parse(event.data as string) as PackageBatch;
    } catch (error) {
      this.logger.log("Failed to parse batch event", { error });
      return;
    }

    for (const update of batch) {
      this.processUpdate(update);
    }
  }

  private processUpdate(update: Package) {
    if (!this.callback) {
      return;
    }

    try {
      const data = this.serializerDeserializer.deserialize(Buffer.from(update.data, "base64"));
      this.callback(update.topic, data, null, this);
    } catch (e) {
      this.callback(
        update.topic,
        null,
        `Error occurred when tried to parse message and call callback, error=${RedstoneCommon.stringifyError(e)}`,
        this
      );
    }
  }

  async publish(payloads: PubSubPayload[]) {
    const packages = payloads.map((payload) => ({
      topic: payload.topic,
      data: this.serializerDeserializer.serialize(payload.data),
    }));

    const encoded = encode(packages);

    await this.httpClient.post(`${this.lightGatewayAddress}/${POST_DATA_ROUTE}`, encoded, {
      headers: { "Content-Type": "application/msgpack" },
    });

    this.logger.log("Published data", { count: packages.length });
  }

  async subscribe(topics: string[], onMessage: SubscribeCallback) {
    this.callback = onMessage;

    const newTopics: string[] = [];

    for (const topic of topics) {
      if (!this.topics.has(topic)) {
        newTopics.push(topic);
      }
      this.topics.add(topic);
    }

    if (!this.sessionId) {
      return this.connect();
    }

    if (this.sessionId && newTopics.length > 0) {
      try {
        await this.httpClient.post(
          `${this.lightGatewayAddress}/${SUBSCRIBE_TO_TOPICS_ROUTE}`,
          { session_id: this.sessionId, topics: newTopics },
          { headers: { "Content-Type": "application/json" } }
        );

        this.logger.log("Subscribed to topics", { topics: newTopics });
      } catch (e) {
        await this.unsubscribe(topics).catch((error) =>
          this.logger.error(RedstoneCommon.stringifyError(error))
        );

        throw new Error(
          `Subscription failed for topics=${topics.join(", ")} error=${RedstoneCommon.stringifyError(e)}`
        );
      }
    }
  }

  async unsubscribe(topics: string[]) {
    const removedTopics: string[] = [];

    for (const topic of topics) {
      if (this.topics.delete(topic)) {
        removedTopics.push(topic);
      }
    }

    if (this.sessionId && removedTopics.length > 0) {
      await this.httpClient.post(
        `${this.lightGatewayAddress}/${UNSUBSCRIBE_FROM_TOPICS_ROUTE}`,
        { session_id: this.sessionId, topics: removedTopics },
        { headers: { "Content-Type": "application/json" } }
      );

      this.logger.log("Unsubscribed from topics", { topics: removedTopics });
    }
  }

  getUniqueName() {
    return this.lightGatewayAddress;
  }

  async beNiceToServer() {
    await this.unsubscribe(Array.from(this.topics.keys()));
  }

  stop() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      this.sessionId = undefined;

      this.logger.log("Stopped SSE stream");
    }

    void this.beNiceToServer();
  }
}
