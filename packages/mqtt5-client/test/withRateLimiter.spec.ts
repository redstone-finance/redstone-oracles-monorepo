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
      getUniqueName: jest.fn(),
    };
  });

  it("should pass messages through when under rate limit", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 10,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 5,
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
      LogMonitoringType.MQTT_RATE_LIMITED,
      expect.stringContaining("test-topic"),
      expect.anything()
    );

    logMonitoringSpy.mockRestore();
  });

  it("should rate limit per topic independently", () => {
    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 3,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 2,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 3,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 5,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 5,
    });

    const errorMessage = "Test error";
    rateLimitedCallback("test-topic", null, errorMessage, mockPubSubClient);

    expect(mockCallback).toHaveBeenCalledWith("test-topic", null, errorMessage, mockPubSubClient);
  });

  it("should handle unsubscribe failures gracefully", async () => {
    mockUnsubscribe.mockRejectedValue(new Error("Unsubscribe failed"));

    const rateLimitedCallback = withRateLimiter({
      callback: mockCallback,
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 2,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 500,
      maxMessagesPerInterval: 1,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 1000,
      maxMessagesPerInterval: 1000,
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
      pubSubClient: mockPubSubClient,
      intervalMs: 2000,
      maxMessagesPerInterval: 50,
    });

    // Exceed rate limit
    for (let i = 0; i < 53; i++) {
      rateLimitedCallback("my-special-topic", { data: i }, null, mockPubSubClient);
    }

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.MQTT_RATE_LIMITED,
      expect.stringContaining("my-special-topic"),
      expect.anything()
    );

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.MQTT_RATE_LIMITED,
      expect.stringContaining("maxMessages=50"),
      expect.anything()
    );

    expect(logMonitoringSpy).toHaveBeenCalledWith(
      LogMonitoringType.MQTT_RATE_LIMITED,
      expect.stringContaining("intervalMs=2000"),
      expect.anything()
    );

    logMonitoringSpy.mockRestore();
  });
});
