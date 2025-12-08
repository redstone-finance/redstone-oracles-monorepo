import { LogMonitoring, LogMonitoringType } from "@redstone-finance/internal-utils";
import type { PubSubClient, SubscribeCallback } from "../src/PubSubClient";
import { withRateLimiter } from "../src/decorators/withRateLimiter";

describe("withRateLimiter", () => {
  let mockCallback: jest.MockedFunction<SubscribeCallback>;
  let mockPubSubClient: jest.Mocked<PubSubClient>;
  let mockUnsubscribe: jest.MockedFunction<(topics: string[]) => Promise<void>>;

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
    mockPubSubClient = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: mockUnsubscribe,
      stop: jest.fn(),
      getUniqueName: jest.fn().mockReturnValue("mock-client"),
    };
  });

  it("should pass messages through when under rate limit", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 10,
    });

    // Send 5 messages (under limit of 10)
    for (let i = 0; i < 5; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    expect(mockCallback).toHaveBeenCalledTimes(5);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("should unsubscribe when rate limit is exceeded for a topic", () => {
    const logMonitoringSpy = jest.spyOn(LogMonitoring, "error").mockImplementation();

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 5,
    });

    // Send 7 messages (exceeds limit of 5)
    for (let i = 0; i < 7; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    // First 5 messages should pass through, 6th triggers rate limit
    expect(mockCallback).toHaveBeenCalledTimes(5);

    // Unsubscribe should be called once
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledWith(["test-topic"]);

    // LogMonitoring should be called
    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.PUB_SUB_TOPIC_RATE_LIMITED,
      expect.stringContaining("test-topic"),
      expect.anything()
    );

    logMonitoringSpy.mockRestore();
  });

  it("should rate limit per topic independently", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 3,
    });

    // Send 3 messages to topic-1 (at limit)
    for (let i = 0; i < 3; i++) {
      rateLimitedCallback("topic-1", { data: i }, null, mockPubSubClient);
    }

    // Send 2 messages to topic-2 (below limit)
    for (let i = 0; i < 2; i++) {
      rateLimitedCallback("topic-2", { data: i }, null, mockPubSubClient);
    }

    // Both topics should have all messages passed through
    expect(mockCallback).toHaveBeenCalledTimes(5);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Now exceed limit for topic-1
    rateLimitedCallback("topic-1", { data: 999 }, null, mockPubSubClient);
    rateLimitedCallback("topic-1", { data: 1000 }, null, mockPubSubClient);

    // topic-1 should be rate limited, but topic-2 should still work
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledWith(["topic-1"]);

    // Send another message to topic-2 (should still work - 3rd message)
    rateLimitedCallback("topic-2", { data: 999 }, null, mockPubSubClient);
    expect(mockCallback).toHaveBeenCalledTimes(6); // 5 + 1 more from topic-2

    // Now exceed limit for topic-2
    rateLimitedCallback("topic-2", { data: 1000 }, null, mockPubSubClient);
    rateLimitedCallback("topic-2", { data: 1001 }, null, mockPubSubClient);

    // topic-2 should also be rate limited now
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledTimes(6); // No more messages through
  });

  it("should permanently block rate-limited topics until restart", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 2,
    });

    // Exceed rate limit
    for (let i = 0; i < 4; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    const callsBeforeAdvance = mockCallback.mock.calls.length;
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);

    // Advance time beyond the interval
    jest.advanceTimersByTime(2000);

    // Try to send more messages - they should be blocked
    for (let i = 0; i < 5; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    // No new messages should be processed
    expect(mockCallback).toHaveBeenCalledTimes(callsBeforeAdvance);
    // Unsubscribe should only be called once (not again)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should reset rate limit after interval expires for non-blocked topics", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 3,
    });

    // Send 3 messages (at limit)
    for (let i = 0; i < 3; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    expect(mockCallback).toHaveBeenCalledTimes(3);

    // Advance time to expire the interval
    jest.advanceTimersByTime(1100);

    // Should be able to send 3 more messages
    for (let i = 0; i < 3; i++) {
      rateLimitedCallback("test-topic", { data: i + 100 }, null, mockPubSubClient);
    }

    expect(mockCallback).toHaveBeenCalledTimes(6);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("should handle errors in callback gracefully", () => {
    mockCallback.mockImplementation(() => {
      throw new Error("Callback error");
    });

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 5,
    });

    // Should not throw, just pass the error through
    expect(() => {
      rateLimitedCallback("test-topic", { data: 1 }, null, mockPubSubClient);
    }).toThrow("Callback error");

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should pass error parameter to callback", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 5,
    });

    const errorMessage = "Test error";
    rateLimitedCallback("test-topic", null, errorMessage, mockPubSubClient);

    expect(mockCallback).toHaveBeenCalledWith("test-topic", null, errorMessage, mockPubSubClient);
  });

  it("should handle unsubscribe failures gracefully", async () => {
    mockUnsubscribe.mockRejectedValue(new Error("Unsubscribe failed"));

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 2,
    });

    // Exceed rate limit
    for (let i = 0; i < 4; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    // Should still attempt to unsubscribe
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);

    // Wait for promise rejection to be handled
    await jest.runAllTimersAsync();

    // Topic should still be blocked even if unsubscribe failed
    rateLimitedCallback("test-topic", { data: 999 }, null, mockPubSubClient);
    expect(mockCallback).toHaveBeenCalledTimes(2); // Only the first 2 (at limit), 3rd triggers rate limit
  });

  it("should work with different rate limit configurations", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 500,
      maxMessagesPerTopicInterval: 1,
    });

    // First message should pass
    rateLimitedCallback("test-topic", { data: 1 }, null, mockPubSubClient);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Second message should trigger rate limit
    rateLimitedCallback("test-topic", { data: 2 }, null, mockPubSubClient);
    rateLimitedCallback("test-topic", { data: 3 }, null, mockPubSubClient);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should handle high volume of messages efficiently", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 1000,
    });

    // Send 1000 messages (at limit)
    for (let i = 0; i < 1000; i++) {
      rateLimitedCallback("test-topic", { data: i }, null, mockPubSubClient);
    }

    expect(mockCallback).toHaveBeenCalledTimes(1000);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // One more should trigger rate limit
    rateLimitedCallback("test-topic", { data: 1000 }, null, mockPubSubClient);
    rateLimitedCallback("test-topic", { data: 1001 }, null, mockPubSubClient);

    expect(mockCallback).toHaveBeenCalledTimes(1000);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should include rate limit details in log message", () => {
    const logMonitoringSpy = jest.spyOn(LogMonitoring, "error").mockImplementation();

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 2000,
      maxMessagesPerTopicInterval: 50,
    });

    // Exceed rate limit
    for (let i = 0; i < 53; i++) {
      rateLimitedCallback("my-special-topic", { data: i }, null, mockPubSubClient);
    }

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.PUB_SUB_TOPIC_RATE_LIMITED,
      expect.stringContaining("my-special-topic"),
      expect.anything()
    );

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.PUB_SUB_TOPIC_RATE_LIMITED,
      expect.stringContaining("maxMessages=50"),
      expect.anything()
    );

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.PUB_SUB_TOPIC_RATE_LIMITED,
      expect.stringContaining("intervalMs=2000"),
      expect.anything()
    );

    logMonitoringSpy.mockRestore();
  });

  it("should disable entire client when per-client rate limit is exceeded", () => {
    const mockStop = jest.fn();
    mockPubSubClient.stop = mockStop;
    mockPubSubClient.getUniqueName = jest.fn().mockReturnValue("test-client-1");

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 100,
      maxMessagesPerClientInterval: 10,
      clientIntervalMs: 1000,
    });

    // Send 11 messages to trigger client rate limit
    for (let i = 0; i < 11; i++) {
      rateLimitedCallback("topic-1", { data: i }, null, mockPubSubClient);
    }

    // First 10 messages should pass through
    expect(mockCallback).toHaveBeenCalledTimes(10);

    // Client should be stopped due to rate limit
    expect(mockStop).toHaveBeenCalledTimes(1);

    // Try to send more messages - they should be blocked
    for (let i = 0; i < 5; i++) {
      rateLimitedCallback("topic-2", { data: i }, null, mockPubSubClient);
    }

    // No new messages should be processed
    expect(mockCallback).toHaveBeenCalledTimes(10);
  });

  it("should track client rate limiters independently per client", () => {
    const mockStopClient1 = jest.fn();
    const mockStopClient2 = jest.fn();

    const mockClient1 = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      stop: mockStopClient1,
      getUniqueName: jest.fn().mockReturnValue("client-1"),
    };

    const mockClient2 = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      stop: mockStopClient2,
      getUniqueName: jest.fn().mockReturnValue("client-2"),
    };

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 100,
      maxMessagesPerClientInterval: 5,
      clientIntervalMs: 1000,
    });

    // Send 6 messages to client-1 (exceeds limit)
    for (let i = 0; i < 6; i++) {
      rateLimitedCallback("topic-1", { data: i }, null, mockClient1);
    }

    // Send 3 messages to client-2 (under limit)
    for (let i = 0; i < 3; i++) {
      rateLimitedCallback("topic-2", { data: i }, null, mockClient2);
    }

    // Client 1 should be stopped
    expect(mockStopClient1).toHaveBeenCalledTimes(1);
    // Client 2 should not be stopped
    expect(mockStopClient2).not.toHaveBeenCalled();

    // Client 1 messages should be limited to 5
    expect(mockCallback.mock.calls.filter((call) => call[3] === mockClient1)).toHaveLength(5);
    // Client 2 messages should all pass through
    expect(mockCallback.mock.calls.filter((call) => call[3] === mockClient2)).toHaveLength(3);
  });

  it("should use clientIntervalMs when specified", () => {
    const mockStop = jest.fn();
    mockPubSubClient.stop = mockStop;
    mockPubSubClient.getUniqueName = jest.fn().mockReturnValue("test-client");

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 100,
      maxMessagesPerClientInterval: 10,
      clientIntervalMs: 500, // Different from intervalMs
    });

    // Send messages at limit
    for (let i = 0; i < 11; i++) {
      rateLimitedCallback("topic-1", { data: i }, null, mockPubSubClient);
    }

    // Should trigger client rate limit using the clientIntervalMs (500ms)
    expect(mockCallback).toHaveBeenCalledTimes(10);
    expect(mockStop).toHaveBeenCalledTimes(1);

    // Advance time beyond client interval (500ms) but within topic interval (1000ms)
    jest.advanceTimersByTime(600);

    // Should still be blocked
    rateLimitedCallback("topic-1", { data: 999 }, null, mockPubSubClient);
    expect(mockCallback).toHaveBeenCalledTimes(10);
  });

  it("should allow per-client rate limiting without per-topic limit being triggered", () => {
    const mockStop = jest.fn();
    mockPubSubClient.stop = mockStop;
    mockPubSubClient.getUniqueName = jest.fn().mockReturnValue("test-client");

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      topicIntervalMs: 1000,
      maxMessagesPerTopicInterval: 100,
      maxMessagesPerClientInterval: 10,
      clientIntervalMs: 1000,
    });

    // Send 10 messages across 5 different topics (2 messages each)
    const topics = ["topic-1", "topic-2", "topic-3", "topic-4", "topic-5"];
    for (const topic of topics) {
      rateLimitedCallback(topic, { data: 1 }, null, mockPubSubClient);
      rateLimitedCallback(topic, { data: 2 }, null, mockPubSubClient);
    }

    // All 10 messages should pass (no per-topic limit exceeded, no per-client limit exceeded)
    expect(mockCallback).toHaveBeenCalledTimes(10);
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // One more message should trigger client rate limit
    rateLimitedCallback("topic-6", { data: 1 }, null, mockPubSubClient);
    rateLimitedCallback("topic-7", { data: 1 }, null, mockPubSubClient);

    // Client should now be stopped
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(10); // Still 10, the new messages were blocked
  });
});
