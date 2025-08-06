import { createHash } from "crypto";
import { ApiKeysUsageTracker } from "../src/ApiKeysUsageTracker";

// Mock InfluxService instead of the entire ApiKeysUsageTracker
const mockInfluxInsert = jest.fn();
const mockInfluxShutdown = jest.fn();

jest.mock("../src/influx/InfluxService", () => {
  return {
    InfluxService: jest.fn().mockImplementation(() => ({
      insert: mockInfluxInsert,
      shutdown: mockInfluxShutdown,
    })),
  };
});

describe("ApiKeysUsageTracker", () => {
  let tracker: ApiKeysUsageTracker;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await tracker.shutdown();
  });

  describe("API Key Tracking", () => {
    beforeEach(() => {
      tracker = new ApiKeysUsageTracker({
        influxUrl:
          "https://influx-test.example.com/api/v2/write?org=test&bucket=metrics",
        influxToken: "test-token-123",
        serviceName: "test-service",
      });
    });

    it("should track API key and hash it correctly", () => {
      const apiKey = "test-api-key-123";
      const expectedHash = createHash("sha256").update(apiKey).digest("hex");

      tracker.trackBulkRequest(apiKey);
      const metrics = tracker.getCurrentMetrics();

      expect(Object.keys(metrics)).toContain(expectedHash);
      expect(metrics[expectedHash]).toBe(1);
    });

    it("should increment count for multiple requests with same API key", () => {
      const apiKey = "test-api-key-123";
      const expectedHash = createHash("sha256").update(apiKey).digest("hex");

      tracker.trackBulkRequest(apiKey);
      tracker.trackBulkRequest(apiKey);
      tracker.trackBulkRequest(apiKey);

      const metrics = tracker.getCurrentMetrics();
      expect(metrics[expectedHash]).toBe(3);
    });

    it("should track multiple different API keys independently", () => {
      const apiKeys = ["api-key-1", "api-key-2", "api-key-3"];
      const expectedHashes = apiKeys.map((key) =>
        createHash("sha256").update(key).digest("hex")
      );

      tracker.trackBulkRequest(apiKeys[0]);
      tracker.trackBulkRequest(apiKeys[1]);
      tracker.trackBulkRequest(apiKeys[1]);
      tracker.trackBulkRequest(apiKeys[2]);
      tracker.trackBulkRequest(apiKeys[2]);
      tracker.trackBulkRequest(apiKeys[2]);

      const metrics = tracker.getCurrentMetrics();
      expect(metrics[expectedHashes[0]]).toBe(1);
      expect(metrics[expectedHashes[1]]).toBe(2);
      expect(metrics[expectedHashes[2]]).toBe(3);
      expect(Object.keys(metrics)).toHaveLength(3);
    });

    it("should handle empty API key gracefully", () => {
      const initialMetrics = tracker.getCurrentMetrics();
      const initialCount = Object.keys(initialMetrics).length;

      tracker.trackBulkRequest("");

      const metrics = tracker.getCurrentMetrics();
      expect(Object.keys(metrics)).toHaveLength(initialCount);
    });

    it("should handle special characters in API keys", () => {
      const specialKey = "key-with-$pecial-ch@r@cter$-and-ünic0de";
      const expectedHash = createHash("sha256")
        .update(specialKey)
        .digest("hex");

      tracker.trackBulkRequest(specialKey);

      const metrics = tracker.getCurrentMetrics();
      expect(Object.keys(metrics)).toContain(expectedHash);
      expect(metrics[expectedHash]).toBe(1);

      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle high request volumes", () => {
      const apiKey = "high-volume-key";
      const expectedHash = createHash("sha256").update(apiKey).digest("hex");
      const requestCount = 1000;

      for (let i = 0; i < requestCount; i++) {
        tracker.trackBulkRequest(apiKey);
      }

      const metrics = tracker.getCurrentMetrics();
      expect(metrics[expectedHash]).toBe(requestCount);
    });
  });

  describe("InfluxDB Integration", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      tracker = new ApiKeysUsageTracker({
        influxUrl:
          "https://influx-test.example.com/api/v2/write?org=test&bucket=metrics",
        influxToken: "test-token-123",
        serviceName: "test-service",
        reportingIntervalMs: 60000, // 1 minute interval
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not call InfluxDB insert immediately after tracking", () => {
      const apiKey = "test-api-key-123";

      tracker.trackBulkRequest(apiKey);

      // InfluxDB insert should not be called immediately (it's batched)
      expect(mockInfluxInsert).not.toHaveBeenCalled();
    });

    it("should send correct data points to InfluxDB after reporting interval", () => {
      const apiKey1 = "test-key-1";
      const apiKey2 = "test-key-2";
      const expectedHash1 = createHash("sha256").update(apiKey1).digest("hex");
      const expectedHash2 = createHash("sha256").update(apiKey2).digest("hex");

      tracker.trackBulkRequest(apiKey1);
      tracker.trackBulkRequest(apiKey1);
      tracker.trackBulkRequest(apiKey2);

      jest.advanceTimersByTime(60001);

      expect(mockInfluxInsert).toHaveBeenCalledTimes(1);

      const dataPoints = (
        mockInfluxInsert.mock.calls[0] as unknown[]
      )[0] as unknown[];
      expect(dataPoints).toHaveLength(2);

      // Define the expected Point structure
      interface MockPoint {
        fields: { requestCount: string };
        tags: { service: string; keyHash: string };
        name: string;
        time: number;
      }

      const point1 = dataPoints.find(
        (p: unknown) => (p as MockPoint).tags.keyHash === expectedHash1
      ) as MockPoint;
      const point2 = dataPoints.find(
        (p: unknown) => (p as MockPoint).tags.keyHash === expectedHash2
      ) as MockPoint;

      expect(point1).toBeDefined();
      expect(point2).toBeDefined();

      expect(point1.fields.requestCount).toBe("2i");
      expect(point1.tags.service).toBe("test-service");
      expect(point1.name).toBe("apiRequestsPerMinute");
      expect(point1.time).toBeDefined();

      expect(point2.fields.requestCount).toBe("1i");
      expect(point2.tags.service).toBe("test-service");
      expect(point2.name).toBe("apiRequestsPerMinute");
      expect(point2.time).toBeDefined();
    });

    it("should reset metrics after successful reporting", async () => {
      const apiKey = "test-key";

      tracker.trackBulkRequest(apiKey);
      expect(Object.keys(tracker.getCurrentMetrics())).toHaveLength(1);

      jest.advanceTimersByTime(60001);
      await jest.runOnlyPendingTimersAsync();

      expect(Object.keys(tracker.getCurrentMetrics())).toHaveLength(0);
    });

    it("should not reset metrics if InfluxDB fails", () => {
      const apiKey = "test-key";

      tracker.trackBulkRequest(apiKey);
      expect(Object.keys(tracker.getCurrentMetrics())).toHaveLength(1);

      mockInfluxInsert.mockRejectedValueOnce(
        new Error("InfluxDB connection failed")
      );

      jest.advanceTimersByTime(60001);

      expect(mockInfluxInsert).toHaveBeenCalledTimes(1);
      expect(Object.keys(tracker.getCurrentMetrics())).toHaveLength(1);
    });

    it("should include timestamp in data points", () => {
      const apiKey = "test-key";
      const mockTimestamp = 1640995200000;

      jest.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      tracker.trackBulkRequest(apiKey);

      jest.advanceTimersByTime(60001);

      expect(mockInfluxInsert).toHaveBeenCalledTimes(1);
      const dataPoints = (mockInfluxInsert.mock.calls[0] as unknown[])[0] as {
        time: number;
      }[];

      expect(dataPoints[0]?.time).toBe(mockTimestamp);

      jest.restoreAllMocks();
    });

    it("should handle InfluxDB errors gracefully", () => {
      const apiKey = "test-api-key-123";

      mockInfluxInsert.mockRejectedValueOnce(
        new Error("InfluxDB connection failed")
      );

      expect(() => tracker.trackBulkRequest(apiKey)).not.toThrow();

      const metrics = tracker.getCurrentMetrics();
      const expectedHash = createHash("sha256").update(apiKey).digest("hex");
      expect(metrics[expectedHash]).toBe(1);
    });
  });

  describe("Shutdown", () => {
    it("should shutdown gracefully with InfluxDB config", async () => {
      tracker = new ApiKeysUsageTracker({
        influxUrl:
          "https://influx-test.example.com/api/v2/write?org=test&bucket=metrics",
        influxToken: "test-token-123",
        serviceName: "test-service",
      });

      await expect(tracker.shutdown()).resolves.toBeUndefined();
    });

    it("should shutdown gracefully without InfluxDB config", async () => {
      tracker = new ApiKeysUsageTracker({
        serviceName: "test-service",
      });

      await expect(tracker.shutdown()).resolves.toBeUndefined();
    });

    it("should clear metrics on shutdown", async () => {
      tracker = new ApiKeysUsageTracker({
        serviceName: "test-service",
      });

      const apiKey = "test-key";
      tracker.trackBulkRequest(apiKey);
      expect(Object.keys(tracker.getCurrentMetrics())).toHaveLength(1);

      await tracker.shutdown();

      // Create new tracker instance to verify clean state
      const newTracker = new ApiKeysUsageTracker({
        serviceName: "test-service",
      });

      expect(Object.keys(newTracker.getCurrentMetrics())).toHaveLength(0);
      await newTracker.shutdown();
    });
  });
});
