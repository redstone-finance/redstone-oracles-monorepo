import { LogMonitoring, LogMonitoringType } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import type { PubSubClient, SubscribeCallback } from "../PubSubClient";
import { RateLimitsCircuitBreaker } from "../RateLimitsCircuitBreaker";

const logger = loggerFactory("withRateLimiter");

export type WithRateLimiterConfig = {
  /**
   * The original SubscribeCallback to wrap. It will be called with its original arguments.
   */
  callback: SubscribeCallback;

  /**
   * Optional: Time window in milliseconds for rate limiting
   * @example 1000 for 1 second window
   */
  topicIntervalMs?: number;

  /**
   * Optional: Time window in milliseconds for per-client rate limiting
   * @example 60000 for 1 minute window
   */
  clientIntervalMs?: number;

  /**
   * Optional:  Maximum number of messages allowed per topic within the interval
   * @example 100 means max 100 messages per topic per intervalMs
   */
  maxMessagesPerTopicInterval?: number;

  /**
   * Optional: Maximum number of messages allowed across all topics for the entire pubSubClient
   * @example 500 means max 500 total messages from all topics per clientIntervalMs
   */
  maxMessagesPerClientInterval?: number;
};

/**
 * Creates a rate-limited wrapper around a SubscribeCallback.
 * Rate limits per topic and per pubSubClient. Unsubscribes from topics that exceed their limit,
 * or unsubscribes from all topics if the entire client exceeds its rate limit.
 * Once a topic or client is rate-limited, it will not be reconnected until service restart.
 *
 * @param {WithRateLimiterConfig} config - Configuration for rate limiting behavior. See {@link WithRateLimiterConfig} for details.
 * @returns {SubscribeCallback} - A new `SubscribeCallback` with rate limiting logic
 *
 * @example
 * ```typescript
 * // Per-topic rate limiting only
 * const rateLimitedCallback = withRateLimiter({
 *   callback,
 *   topicIntervalMs: 1000,
 *   maxMessagesPerTopicInterval: 100
 * });
 * await pubSubClient.subscribe(topics, rateLimitedCallback);
 * ```
 *
 * @example
 * ```typescript
 * // Per-topic and per-client rate limiting
 * const rateLimitedCallback = withRateLimiter({
 *   callback,
 *   topicIntervalMs: 1000,
 *   maxMessagesPerTopicInterval: 100,
 *   maxMessagesPerClientInterval: 1000,
 *   clientIntervalMs: 1000
 * });
 * await pubSubClient.subscribe(topics, rateLimitedCallback);
 * ```
 */
export function withRateLimiter({
  callback,
  topicIntervalMs,
  maxMessagesPerTopicInterval,
  maxMessagesPerClientInterval,
  clientIntervalMs,
}: WithRateLimiterConfig): SubscribeCallback {
  const rateLimitedTopics = new Set<string>();
  const rateLimitedClients = new Set<string>();

  const rateLimiters = new Map<string, RateLimitsCircuitBreaker>();
  const clientRateLimiters = new Map<string, RateLimitsCircuitBreaker>();

  return (
    topicName: string,
    messagePayload: unknown,
    error: string | null,
    pubSubClient: PubSubClient
  ) => {
    try {
      const clientUniqueName = pubSubClient.getUniqueName();
      const topicKey = `${clientUniqueName}-${topicName}`;

      if (rateLimitedClients.has(clientUniqueName) || rateLimitedTopics.has(topicKey)) {
        return;
      }

      // Check per-client rate limit if configured
      if (maxMessagesPerClientInterval && clientIntervalMs) {
        let clientRateLimiter = clientRateLimiters.get(clientUniqueName);
        if (!clientRateLimiter) {
          clientRateLimiter = new RateLimitsCircuitBreaker(
            clientIntervalMs,
            maxMessagesPerClientInterval
          );
          clientRateLimiters.set(clientUniqueName, clientRateLimiter);
        }

        clientRateLimiter.recordEvent();
        if (clientRateLimiter.shouldBreakCircuit()) {
          rateLimitedClients.add(clientUniqueName);

          LogMonitoring.error(
            LogMonitoringType.PUB_SUB_CLIENT_RATE_LIMITED,
            `PubSubClient rate limit exceeded: client=${clientUniqueName}, maxMessages=${maxMessagesPerClientInterval}, intervalMs=${clientIntervalMs}. Disabling entire client.`,
            logger
          );

          // Stop the client to disable all topics
          pubSubClient.stop();

          logger.warn(`Disabled entire pubSubClient due to rate limit: ${clientUniqueName}`);
          return;
        }
      }

      if (maxMessagesPerTopicInterval && topicIntervalMs) {
        let rateLimiter = rateLimiters.get(topicKey);
        if (!rateLimiter) {
          rateLimiter = new RateLimitsCircuitBreaker(topicIntervalMs, maxMessagesPerTopicInterval);
          rateLimiters.set(topicKey, rateLimiter);
        }

        rateLimiter.recordEvent();
        if (rateLimiter.shouldBreakCircuit()) {
          rateLimitedTopics.add(topicKey);

          LogMonitoring.error(
            LogMonitoringType.PUB_SUB_TOPIC_RATE_LIMITED,
            `Topic rate limit exceeded: topic=${topicName}, client=${clientUniqueName}, maxMessages=${maxMessagesPerTopicInterval}, intervalMs=${topicIntervalMs}. Unsubscribing from topic.`,
            logger
          );

          pubSubClient
            .unsubscribe([topicName])
            .then(() => {
              logger.info(
                `Successfully unsubscribed from rate-limited topic: ${topicName} on client: ${clientUniqueName}`
              );
            })
            .catch((unsubscribeError) => {
              logger.error(
                `Failed to unsubscribe from rate-limited topic: ${topicName} on client: ${clientUniqueName}`,
                unsubscribeError
              );
            });

          return;
        }
      }
    } catch (e) {
      logger.error(`Failed to calculate rate limits error=${RedstoneCommon.stringifyError(e)}`);
    }

    return callback(topicName, messagePayload, error, pubSubClient);
  };
}
