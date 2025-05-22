import { RedstoneCommon } from "@redstone-finance/utils";
import { promises as fs } from "fs";
import nodeSchedule from "node-schedule";
import { RedstoneHealthcheck } from "../src";

jest.mock("node-schedule");
jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn(),
    rename: jest.fn(),
  },
}));
jest.mock("@redstone-finance/utils", () => ({
  RedstoneCommon: {
    intervalMsToCronFormat: jest.fn(),
    timeout: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    stringifyError: jest.fn((err) => err.toString()),
  },
  loggerFactory: () => ({
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe("HealthMonitor", () => {
  let mockScheduleJob: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockRename: jest.Mock;
  let mockTimeout: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleJob = nodeSchedule.scheduleJob as jest.Mock;
    mockWriteFile = fs.writeFile as jest.Mock;
    mockRename = fs.rename as jest.Mock;
    mockTimeout = RedstoneCommon.timeout as jest.Mock;

    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    (RedstoneCommon.intervalMsToCronFormat as jest.Mock).mockReturnValue(
      "*/5 * * * *"
    );
  });

  describe("constructor", () => {
    it("should schedule health checks with correct interval", () => {
      const intervalMs = 5000;
      new RedstoneHealthcheck.HealthMonitor(new Map(), intervalMs);

      expect(RedstoneCommon.intervalMsToCronFormat).toHaveBeenCalledWith(
        intervalMs
      );
      expect(mockScheduleJob).toHaveBeenCalledWith(
        "*/5 * * * *",
        expect.any(Function)
      );
    });
  });

  describe("runChecks", () => {
    const mockDate = new Date();

    it("should handle healthy checks", async () => {
      const mockHealthCheck: RedstoneHealthcheck.HealthCheck = {
        check: jest.fn().mockResolvedValue(RedstoneHealthcheck.healthy()),
      };

      const checks = new Map([["test", mockHealthCheck]]);
      new RedstoneHealthcheck.HealthMonitor(checks, 5000);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      mockTimeout.mockImplementation((promise) => promise);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      const scheduledCallback = mockScheduleJob.mock.calls[0][1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await scheduledCallback(mockDate);

      expect(mockWriteFile).toHaveBeenCalledWith(
        "healthcheck.txt.tmp",
        RedstoneHealthcheck.HealthStatus.healthy,
        { encoding: "utf8" }
      );
      expect(mockRename).toHaveBeenCalledWith(
        "healthcheck.txt.tmp",
        "healthcheck.txt"
      );
    });

    it("should handle unhealthy checks", async () => {
      const mockHealthCheck: RedstoneHealthcheck.HealthCheck = {
        check: jest
          .fn()
          .mockResolvedValue(RedstoneHealthcheck.unhealthy(["Error occurred"])),
      };

      const checks = new Map([["test", mockHealthCheck]]);
      new RedstoneHealthcheck.HealthMonitor(checks, 5000);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      mockTimeout.mockImplementation((promise) => promise);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      const scheduledCallback = mockScheduleJob.mock.calls[0][1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await scheduledCallback(mockDate);

      expect(mockWriteFile).toHaveBeenCalledWith(
        "healthcheck.txt.tmp",
        RedstoneHealthcheck.HealthStatus.unhealthy,
        { encoding: "utf8" }
      );
    });

    it("should handle timeout errors", async () => {
      const mockHealthCheck: RedstoneHealthcheck.HealthCheck = {
        check: jest.fn().mockResolvedValue(RedstoneHealthcheck.healthy()),
      };

      const checks = new Map([["test", mockHealthCheck]]);
      new RedstoneHealthcheck.HealthMonitor(checks, 5000);
      mockTimeout.mockRejectedValue(new Error("Timeout"));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      const scheduledCallback = mockScheduleJob.mock.calls[0][1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await scheduledCallback(mockDate);

      expect(mockWriteFile).toHaveBeenCalledWith(
        "healthcheck.txt.tmp",
        RedstoneHealthcheck.HealthStatus.unhealthy,
        { encoding: "utf8" }
      );
    });

    it("should handle multiple checks with mixed results", async () => {
      const healthyCheck: RedstoneHealthcheck.HealthCheck = {
        check: jest.fn().mockResolvedValue(RedstoneHealthcheck.healthy()),
      };
      const unhealthyCheck: RedstoneHealthcheck.HealthCheck = {
        check: jest
          .fn()
          .mockResolvedValue(RedstoneHealthcheck.unhealthy(["Error"])),
      };

      const checks = new Map([
        ["healthy", healthyCheck],
        ["unhealthy", unhealthyCheck],
      ]);
      new RedstoneHealthcheck.HealthMonitor(checks, 5000);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      mockTimeout.mockImplementation((promise) => promise);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      const scheduledCallback = mockScheduleJob.mock.calls[0][1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await scheduledCallback(mockDate);

      expect(mockWriteFile).toHaveBeenCalledWith(
        "healthcheck.txt.tmp",
        RedstoneHealthcheck.HealthStatus.unhealthy,
        { encoding: "utf8" }
      );
    });
  });
});
