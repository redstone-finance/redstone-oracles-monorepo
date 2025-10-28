import { LogMonitoring, LogMonitoringType } from "@redstone-finance/internal-utils";
import { loggerFactory } from "@redstone-finance/utils";
import type { PubSubClient, SubscribeCallback } from "../PubSubClient";
import { RateLimitsCircuitBreaker } from "../RateLimitsCircuitBreaker";

const logger = loggerFactory("withRateLimiter");

export type WithRateLimiterConfig = {
  /**
   * The original SubscribeCallback to wrap. It will be called with the topic name, message payload, and error.
   */
  callback: SubscribeCallback;
  /**
   * PubSubClient instance to call unsubscribe when rate limit is hit
   */
  pubSubClient: PubSubClient;
  /**
   * Time window in milliseconds for rate limiting
   * @example 1000 for 1 second window
   */
  intervalMs: number;

  /**
   * Maximum number of messages allowed per topic within the interval
   * @example 100 means max 100 messages per topic per intervalMs
   */
  maxMessagesPerInterval: number;
};

/**
 * Creates a rate-limited wrapper around a SubscribeCallback.
 * Rate limits per topic and unsubscribes from topics that exceed the limit.
 * Once a topic is rate-limited, it will not be reconnected until service restart.
 *
 * @param {WithRateLimiterConfig} config - Configuration for rate limiting behavior. See {@link WithRateLimiterConfig} for details.
 * @returns {SubscribeCallback} - A new `SubscribeCallback` with rate limiting logic
 *
 * @example
 * ```typescript
 * const rateLimitedCallback = withRateLimiter(
 *   { callback, pubSubClient, intervalMs: 1000, maxMessagesPerInterval: 100 }
 * );
 * await pubSubClient.subscribe(topics, rateLimitedCallback);
 * ```
 */
export function withRateLimiter({
  callback,
  pubSubClient,
  intervalMs,
  maxMessagesPerInterval,
}: WithRateLimiterConfig): SubscribeCallback {
  const rateLimiters = new Map<string, RateLimitsCircuitBreaker>();
  const rateLimitedTopics = new Set<string>();

  return (
    topicName: string,
    messagePayload: unknown,
    error: string | null,
    client: PubSubClient
  ) => {
    if (rateLimitedTopics.has(topicName)) {
      return;
    }

    let rateLimiter = rateLimiters.get(topicName);
    if (!rateLimiter) {
      rateLimiter = new RateLimitsCircuitBreaker(intervalMs, maxMessagesPerInterval);
      rateLimiters.set(topicName, rateLimiter);
    }

    rateLimiter.recordEvent();
    if (rateLimiter.shouldBreakCircuit()) {
      rateLimitedTopics.add(topicName);

      LogMonitoring.error(
        LogMonitoringType.MQTT_RATE_LIMITED,
        `Topic rate limit exceeded: topic=${topicName}, maxMessages=${maxMessagesPerInterval}, intervalMs=${intervalMs}. Unsubscribing from topic.`,
        logger
      );

      pubSubClient
        .unsubscribe([topicName])
        .then(() => {
          logger.info(`Successfully unsubscribed from rate-limited topic: ${topicName}`);
        })
        .catch((unsubscribeError) => {
          logger.error(
            `Failed to unsubscribe from rate-limited topic: ${topicName}`,
            unsubscribeError
          );
        });

      return;
    }

    return callback(topicName, messagePayload, error, client);
  };
}
