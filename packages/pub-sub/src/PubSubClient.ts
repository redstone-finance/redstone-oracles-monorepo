import { ContentTypes } from "@redstone-finance/internal-utils";

export type PubSubPayload = {
  /** valid topic @see topic.ts */
  topic: string;
  /** valid json object */
  data: unknown;
};

export type SubscribeCallback = (
  /** encoded topic @see topic.ts */
  topicName: string,
  messagePayload: unknown,
  error: string | null,
  /** use wisely */
  client: PubSubClient
) => unknown;

/**
 * Topic strings follow MQTT conventions throughout this interface:
 *  - Segments are separated by "/"  e.g. "data-package/redstone-primary/BTC/0xabc"
 *  - "+" matches exactly one segment  e.g. "data-package/redstone-primary/+/0xabc"
 *  - "#" matches zero or more trailing segments  e.g. "data-package/redstone-primary/#"
 *
 * Implementations that use a different native format (e.g. NATS uses "." as separator
 * and "*" / ">" as wildcards) are responsible for translating topics at the boundary.
 * See NatsClient for a reference implementation of such translation.
 */
export interface PubSubClient {
  /**
   * Publishes multiple payloads in a single batch
   * @param payloads Array of topic and data pairs to publish
   * @param contentType The content type of the messages
   */
  publish(payloads: PubSubPayload[], contentType: ContentTypes): Promise<void>;

  /**
   * Sets the callback to handle incoming messages.
   * Must be called before subscribe.
   * @param onMessage Callback function for handling received messages
   */
  setOnMessageHandler(onMessage: SubscribeCallback): void;

  /**
   * Subscribes to multiple topics
   * @param topics Array of topics to subscribe to
   */
  subscribe(topics: string[]): Promise<void>;

  /**
   * Unsubscribes from specified topics
   * @param topics Array of topics to unsubscribe from
   */
  unsubscribe(topics: string[]): Promise<void>;

  /**
   * MUST return unique name across application (e.g. hostname)
   */
  getUniqueName(): string;

  stop(): void;
}
