import {
  healthy,
  ResourcesHealthCheck,
  ResourceThresholds,
  unhealthy,
} from "../src";

const mockV8HeapStats = jest.fn();

jest.mock("node:v8", () => ({
  // note: the wrapping fn prevents from hoisting error.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  getHeapStatistics: () => mockV8HeapStats(),
}));

describe("ResourcesHealthCheck", () => {
  let healthCheck: ResourcesHealthCheck;
  const defaultThresholds: ResourceThresholds = {
    memoryPercent: 70,
    gracePeriodMs: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    healthCheck = new ResourcesHealthCheck(defaultThresholds);
  });

  function mockMemUsage(percentage: number) {
    mockV8HeapStats.mockReturnValue({
      used_heap_size: percentage,
      heap_size_limit: 100,
    });
  }

  describe("check method", () => {
    it("should return healthy when usage is below thresholds", async () => {
      mockMemUsage(50);

      const result = await healthCheck.check(new Date());

      expect(mockV8HeapStats).toHaveBeenCalled();
      expect(result).toEqual(await healthy());
    });

    it("should return healthy on first threshold exceed", async () => {
      mockMemUsage(90);

      const result = await healthCheck.check(new Date());

      expect(mockV8HeapStats).toHaveBeenCalled();
      expect(result).toEqual(await healthy());
    });

    it("should return healthy when within grace period", async () => {
      mockMemUsage(90);

      const now = new Date();
      await healthCheck.check(now);

      const laterTime = new Date(now.getTime() + 500);
      const result = await healthCheck.check(laterTime);

      expect(mockV8HeapStats).toHaveBeenCalled();
      expect(result).toEqual(await healthy());
    });

    it("should return unhealthy when exceeding grace period", async () => {
      mockMemUsage(90);

      const now = new Date();
      await healthCheck.check(now);

      const laterTime = new Date(now.getTime() + 1500); // 1500ms > 1000ms grace period
      const result = await healthCheck.check(laterTime);

      expect(mockV8HeapStats).toHaveBeenCalledTimes(2);
      expect(result).toEqual(
        await unhealthy([
          expect.stringContaining("Mem usage exceeded for"),
        ] as string[])
      );
    });

    it("should reset timer when usage returns below thresholds", async () => {
      mockMemUsage(90);
      const now = new Date();
      await healthCheck.check(now);

      mockMemUsage(50);
      await healthCheck.check(new Date(now.getTime() + 500));

      mockMemUsage(90);
      const result = await healthCheck.check(new Date(now.getTime() + 1000));

      expect(mockV8HeapStats).toHaveBeenCalledTimes(3);
      expect(result).toEqual(await healthy());
    });
  });
});
