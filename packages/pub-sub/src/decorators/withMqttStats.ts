import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PubSubClient, SubscribeCallback } from "../PubSubClient";

const logger = loggerFactory("mqtt-stats");

interface StatsMetrics {
  max: number;
  min: number;
  avg: number;
  total: number;
}

/**
 * Tracks MQTT message statistics per topic and per client
 * Aggregates messages per second until logged, then clears the data
 */
export class MqttStatsTracker {
  private readonly topicStats = new Map<string, Map<number, number>>();
  private readonly clientStats = new Map<string, Map<number, number>>();

  constructor(private readonly logIntervalMs: number = 60_000) {
    setInterval(() => {
      this.logAndClearStatistics();
    }, this.logIntervalMs).unref();

    logger.info(`MQTT stats tracker started, will log every ${this.logIntervalMs / 1000}s`);
  }

  recordMessage(topicName: string, clientName: string): void {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);

    MqttStatsTracker.updateStats(this.topicStats, topicName, currentSecond);
    MqttStatsTracker.updateStats(this.clientStats, clientName, currentSecond);
  }

  private static updateStats(
    statsMap: Map<string, Map<number, number>>,
    key: string,
    currentSecond: number
  ): void {
    let countsPerSecond = statsMap.get(key);

    if (!countsPerSecond) {
      countsPerSecond = new Map<number, number>();
      statsMap.set(key, countsPerSecond);
    }

    const currentCount = countsPerSecond.get(currentSecond) || 0;
    countsPerSecond.set(currentSecond, currentCount + 1);
  }

  private static computeMetrics(countsPerSecond: Map<number, number>): StatsMetrics {
    const counts = Array.from(countsPerSecond.values());

    if (counts.length === 0) {
      return { max: 0, min: 0, avg: 0, total: 0 };
    }

    const total = counts.reduce((sum, count) => sum + count, 0);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const avg = total / counts.length;

    return {
      max,
      min,
      avg: Math.round(avg * 100) / 100,
      total,
    };
  }

  private logAndClearStatistics(): void {
    const topicMetrics = this.getTopicMetrics();
    const clientMetrics = this.getClientMetrics();

    if (topicMetrics.length === 0 && clientMetrics.length === 0) {
      logger.info("MQTT Stats: No messages received in the last interval");
      return;
    }

    if (topicMetrics.length > 0) {
      logger.info("MQTT Stats - Per Topic (msgs/sec):", {
        topics: topicMetrics,
      });
    }

    if (clientMetrics.length > 0) {
      logger.info("MQTT Stats - Per Client (msgs/sec):", {
        clients: clientMetrics,
      });
    }

    this.clearStats();
  }

  private clearStats(): void {
    this.topicStats.clear();
    this.clientStats.clear();
  }

  getTopicMetrics(): Array<{ topic: string; metrics: StatsMetrics }> {
    return Array.from(this.topicStats.entries(), ([topic, countsPerSecond]) => ({
      topic,
      metrics: MqttStatsTracker.computeMetrics(countsPerSecond),
    }));
  }

  getClientMetrics(): Array<{ client: string; metrics: StatsMetrics }> {
    return Array.from(this.clientStats.entries(), ([client, countsPerSecond]) => ({
      client,
      metrics: MqttStatsTracker.computeMetrics(countsPerSecond),
    }));
  }
}

export type WithMqttStatsConfig = {
  /**
   * The original SubscribeCallback to wrap
   */
  callback: SubscribeCallback;

  /**
   * Optional: Interval in milliseconds for logging statistics
   * @default 60000 (1 minute)
   */
  logIntervalMs?: number;
};

/**
 * Creates a wrapper around a SubscribeCallback that tracks MQTT message statistics.
 * Tracks messages per topic per second and per client per second.
 * Computes and logs max/min/avg statistics at regular intervals, then clears the data.
 * The stats tracker starts automatically when this function is called.
 *
 * @param {WithMqttStatsConfig} config - Configuration for stats tracking
 * @returns {SubscribeCallback} - A new SubscribeCallback with stats tracking
 *
 * @example
 * ```typescript
 * const statsCallback = withMqttStats({
 *   callback: myCallback,
 *   logIntervalMs: 60000 // Log every minute
 * });
 * await pubSubClient.subscribe(topics, statsCallback);
 * ```
 */
export function withMqttStats({
  callback,
  logIntervalMs = 60_000,
}: WithMqttStatsConfig): SubscribeCallback {
  const tracker = new MqttStatsTracker(logIntervalMs);

  const wrappedCallback: SubscribeCallback = (
    topicName: string,
    messagePayload: unknown,
    error: string | null,
    pubSubClient: PubSubClient
  ) => {
    try {
      tracker.recordMessage(topicName, pubSubClient.getUniqueName());
    } catch (e) {
      logger.error(`Failed to record message stats error=${RedstoneCommon.stringifyError(e)}`);
    }

    return callback(topicName, messagePayload, error, pubSubClient);
  };

  return wrappedCallback;
}
