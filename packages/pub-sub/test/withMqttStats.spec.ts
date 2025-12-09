// Mock logger before importing the module
const mockLoggerInfo = jest.fn();
jest.mock("@redstone-finance/utils", () => ({
  ...jest.requireActual<object>("@redstone-finance/utils"),
  loggerFactory: () => ({
    info: mockLoggerInfo,
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { MqttStatsTracker, withMqttStats } from "../src/decorators/withMqttStats";
import { PubSubClient } from "../src/PubSubClient";

describe("MqttStatsTracker", () => {
  let statsTracker: MqttStatsTracker;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLoggerInfo.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("logging", () => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    it("should log statistics with logger when messages are recorded and clear data", () => {
      statsTracker = new MqttStatsTracker(60_000);

      // Verify constructor logged the start message
      expect(mockLoggerInfo).toHaveBeenCalledWith("MQTT stats tracker started, will log every 60s");

      mockLoggerInfo.mockClear();

      // Record some messages on different topics and clients
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-2", "client-2");

      // Verify data is recorded before logging
      expect(statsTracker.getTopicMetrics()).toHaveLength(2);

      // Advance time to trigger logging
      jest.advanceTimersByTime(60_000);

      // Verify logger was called twice (once for topics, once for clients)
      expect(mockLoggerInfo).toHaveBeenCalledTimes(2);

      // Verify logger was called for topics
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "MQTT Stats - Per Topic (msgs/sec):",
        expect.objectContaining({
          topics: expect.arrayContaining([
            expect.objectContaining({
              topic: "topic-1",
              metrics: expect.objectContaining({
                total: 2,
                max: 2,
                min: 2,
                avg: 2,
              }),
            }),
            expect.objectContaining({
              topic: "topic-2",
              metrics: expect.objectContaining({
                total: 1,
                max: 1,
                min: 1,
                avg: 1,
              }),
            }),
          ]),
        })
      );

      // Verify logger was called for clients
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "MQTT Stats - Per Client (msgs/sec):",
        expect.objectContaining({
          clients: expect.arrayContaining([
            expect.objectContaining({
              client: "client-1",
              metrics: expect.objectContaining({
                total: 2,
              }),
            }),
            expect.objectContaining({
              client: "client-2",
              metrics: expect.objectContaining({
                total: 1,
              }),
            }),
          ]),
        })
      );

      // Verify data was cleared after logging
      expect(statsTracker.getTopicMetrics()).toHaveLength(0);
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  describe("recordMessage", () => {
    it("should record single message for topic", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics).toHaveLength(1);
      expect(topicMetrics[0].topic).toBe("test-topic");
      expect(topicMetrics[0].metrics.total).toBe(1);
    });

    it("should record single message for client", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");

      const clientMetrics = statsTracker.getClientMetrics();
      expect(clientMetrics).toHaveLength(1);
      expect(clientMetrics[0].client).toBe("test-client");
      expect(clientMetrics[0].metrics.total).toBe(1);
    });

    it("should record multiple messages in same second", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.total).toBe(3);
      expect(topicMetrics[0].metrics.max).toBe(3);
      expect(topicMetrics[0].metrics.avg).toBe(3);
    });

    it("should track messages across different seconds", () => {
      statsTracker = new MqttStatsTracker(60_000);
      // Record 3 messages in first second
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      // Record 5 messages in second second
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.total).toBe(8);
      expect(topicMetrics[0].metrics.max).toBe(5); // Max in one second
      expect(topicMetrics[0].metrics.min).toBe(3); // Min in one second
      expect(topicMetrics[0].metrics.avg).toBe(4); // (3 + 5) / 2
    });

    it("should track multiple topics independently", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-2", "client-1");

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics).toHaveLength(2);

      const topic1 = topicMetrics.find((m) => m.topic === "topic-1");
      const topic2 = topicMetrics.find((m) => m.topic === "topic-2");

      expect(topic1?.metrics.total).toBe(2);
      expect(topic2?.metrics.total).toBe(1);
    });

    it("should track multiple clients independently", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-1", "client-1");
      statsTracker.recordMessage("topic-2", "client-2");
      statsTracker.recordMessage("topic-2", "client-2");
      statsTracker.recordMessage("topic-2", "client-2");

      const clientMetrics = statsTracker.getClientMetrics();
      expect(clientMetrics).toHaveLength(2);

      const client1 = clientMetrics.find((m) => m.client === "client-1");
      const client2 = clientMetrics.find((m) => m.client === "client-2");

      expect(client1?.metrics.total).toBe(2);
      expect(client2?.metrics.total).toBe(3);
    });
  });

  describe("metrics computation", () => {
    it("should compute max correctly", () => {
      statsTracker = new MqttStatsTracker(60_000);
      // Second 1: 2 messages
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      jest.advanceTimersByTime(1000);

      // Second 2: 5 messages (max)
      for (let i = 0; i < 5; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      jest.advanceTimersByTime(1000);

      // Second 3: 3 messages
      for (let i = 0; i < 3; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.max).toBe(5);
    });

    it("should compute min correctly", () => {
      statsTracker = new MqttStatsTracker(60_000);
      // Second 1: 5 messages
      for (let i = 0; i < 5; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      jest.advanceTimersByTime(1000);

      // Second 2: 2 messages (min)
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      jest.advanceTimersByTime(1000);

      // Second 3: 3 messages
      for (let i = 0; i < 3; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.min).toBe(2);
    });

    it("should compute avg correctly", () => {
      statsTracker = new MqttStatsTracker(60_000);
      // Second 1: 2 messages
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      jest.advanceTimersByTime(1000);

      // Second 2: 4 messages
      for (let i = 0; i < 4; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      jest.advanceTimersByTime(1000);

      // Second 3: 6 messages
      for (let i = 0; i < 6; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.avg).toBe(4);
      expect(topicMetrics[0].metrics.total).toBe(12);
    });

    it("should handle gaps in time correctly", () => {
      statsTracker = new MqttStatsTracker(60_000);
      // Record messages in second 1
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      // Advance time by 5 seconds (creating gaps)
      jest.advanceTimersByTime(5000);

      // Record messages in second 6
      for (let i = 0; i < 4; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
      }

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.max).toBe(4);
      expect(topicMetrics[0].metrics.min).toBe(2);
      expect(topicMetrics[0].metrics.avg).toBe(3);
    });
  });

  describe("data management", () => {
    it("should accumulate data continuously", () => {
      statsTracker = new MqttStatsTracker(60_000);

      // Record messages over several seconds
      for (let i = 0; i < 5; i++) {
        statsTracker.recordMessage("test-topic", "test-client");
        jest.advanceTimersByTime(1000);
      }

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics[0].metrics.total).toBe(5);
      expect(topicMetrics[0].metrics.max).toBe(1); // 1 per second
      expect(topicMetrics[0].metrics.min).toBe(1);
    });

    it("should clear data after logging", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      // Verify data is there
      let topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics).toHaveLength(1);
      expect(topicMetrics[0].metrics.total).toBe(2);

      // Advance time to trigger logging (which clears data)
      jest.advanceTimersByTime(60_000);

      // Data should be cleared now
      topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics).toHaveLength(0);
    });

    it("should accumulate data again after clearing", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");

      // Trigger log (clears data)
      jest.advanceTimersByTime(60_000);

      // Record new messages
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");

      const topicMetrics = statsTracker.getTopicMetrics();
      expect(topicMetrics).toHaveLength(1);
      expect(topicMetrics[0].metrics.total).toBe(3);
    });
  });

  describe("periodic logging", () => {
    it("should trigger periodic logging at specified interval and clear data", () => {
      statsTracker = new MqttStatsTracker(60_000);
      statsTracker.recordMessage("test-topic", "test-client");

      // Get initial metrics
      const initialMetrics = statsTracker.getTopicMetrics();
      expect(initialMetrics).toHaveLength(1);

      // Advance time to trigger log (logging clears data)
      jest.advanceTimersByTime(60_000);

      // Metrics should be cleared after log
      const metricsAfterLog = statsTracker.getTopicMetrics();
      expect(metricsAfterLog).toHaveLength(0);
    });

    it("should continue logging at regular intervals", () => {
      statsTracker = new MqttStatsTracker(60_000);

      // First interval
      statsTracker.recordMessage("test-topic", "test-client");
      jest.advanceTimersByTime(60_000);

      // Second interval - add more messages
      statsTracker.recordMessage("test-topic", "test-client");
      statsTracker.recordMessage("test-topic", "test-client");
      jest.advanceTimersByTime(60_000);

      // Tracker should still be functional
      const metrics = statsTracker.getTopicMetrics();
      expect(metrics).toHaveLength(0); // Cleared after log
    });

    it("should handle logging when no data is available", () => {
      statsTracker = new MqttStatsTracker(60_000);

      // No messages recorded
      const metrics = statsTracker.getTopicMetrics();
      expect(metrics).toHaveLength(0);

      jest.advanceTimersByTime(60_000);

      // Should still work after logging empty stats
      statsTracker.recordMessage("test-topic", "test-client");
      const metricsAfterLog = statsTracker.getTopicMetrics();
      expect(metricsAfterLog).toHaveLength(1);
    });
  });
});

describe("withMqttStats decorator", () => {
  let mockCallback: jest.Mock;
  let mockPubSubClient: PubSubClient;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCallback = jest.fn();
    mockPubSubClient = {
      getUniqueName: jest.fn().mockReturnValue("test-client"),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      stop: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("decorator creation", () => {
    it("should create wrapped callback", () => {
      const wrappedCallback = withMqttStats({ callback: mockCallback });
      expect(wrappedCallback).toBeDefined();
      expect(typeof wrappedCallback).toBe("function");
    });

    it("should start tracking automatically when decorator is created", () => {
      const wrappedCallback = withMqttStats({ callback: mockCallback });

      // The wrapped callback should work immediately
      wrappedCallback("test-topic", { data: "test" }, null, mockPubSubClient);

      expect(mockCallback).toHaveBeenCalled();
    });

    it("should accept custom log interval", () => {
      const wrappedCallback = withMqttStats({
        callback: mockCallback,
        logIntervalMs: 30_000,
      });

      expect(wrappedCallback).toBeDefined();
    });
  });

  describe("message tracking", () => {
    it("should call original callback with all arguments", () => {
      const wrappedCallback = withMqttStats({
        callback: mockCallback,
      });

      const payload = { data: "test" };
      wrappedCallback("test-topic", payload, null, mockPubSubClient);

      expect(mockCallback).toHaveBeenCalledWith("test-topic", payload, null, mockPubSubClient);
    });

    it("should call original callback even when error occurs", () => {
      const wrappedCallback = withMqttStats({
        callback: mockCallback,
      });

      wrappedCallback("test-topic", null, "Network error", mockPubSubClient);

      expect(mockCallback).toHaveBeenCalledWith(
        "test-topic",
        null,
        "Network error",
        mockPubSubClient
      );
    });

    it("should track messages from pubSubClient", () => {
      const wrappedCallback = withMqttStats({
        callback: mockCallback,
      });

      wrappedCallback("test-topic", { data: "test" }, null, mockPubSubClient);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- add reason here, please
      expect(mockPubSubClient.getUniqueName).toHaveBeenCalled();
    });
  });

  describe("integration with rate limiter", () => {
    it("should work as a composable decorator", () => {
      const wrappedCallback = withMqttStats({
        callback: mockCallback,
      });

      // Simulate another decorator wrapping the statsCallback
      const composedCallback = (
        topic: string,
        payload: unknown,
        error: string | null,
        client: PubSubClient
      ) => {
        // Rate limiter logic would go here
        return wrappedCallback(topic, payload, error, client);
      };

      composedCallback("test-topic", { data: "test" }, null, mockPubSubClient);

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("return value", () => {
    it("should return value from original callback", () => {
      const callbackWithReturn = jest.fn().mockReturnValue("success");
      const wrappedCallback = withMqttStats({
        callback: callbackWithReturn,
      });

      const result = wrappedCallback("test-topic", { data: "test" }, null, mockPubSubClient);

      expect(result).toBe("success");
    });
  });
});
