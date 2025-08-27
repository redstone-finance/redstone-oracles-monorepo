import { loggerFactory } from "@redstone-finance/utils";
import { ConfigHistory, HistoricalConfig } from "../src/ConfigHistory";

jest.mock("@redstone-finance/utils", () => ({
  loggerFactory: jest.fn().mockReturnValue({
    warn: jest.fn(),
  }),
}));

describe("ConfigHistory", () => {
  let configHistory: ConfigHistory;
  const logger = loggerFactory("ConfigHistory");

  beforeEach(() => {
    configHistory = new ConfigHistory();
  });

  it("should add config to the history", () => {
    const config: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: false,
    };

    configHistory.add(config);

    expect(configHistory["history"]).toHaveLength(1);
    expect(configHistory["history"][0]).toEqual(config);
  });

  it("should identify if an updateHash is blacklisted", () => {
    const config: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: true,
    };

    configHistory.add(config);

    expect(configHistory.isUpdateHashBlacklisted("update1")).toBe(true);
    expect(configHistory.isUpdateHashBlacklisted("update2")).toBe(false);
  });

  it("should blacklist a configHash", () => {
    const config: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: false,
    };

    configHistory.add(config);

    configHistory.blacklistConfigHash("hash1");

    expect(configHistory["history"][0].blacklisted).toBe(true);
  });

  it("should log a warning when trying to blacklist a non-existent configHash", () => {
    const config: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: false,
    };

    configHistory.add(config);

    configHistory.blacklistConfigHash("nonExistentHash");

    expect(logger.warn).toHaveBeenCalledWith(
      "Historical config with hash nonExistentHash not found - cannot blacklist"
    );
  });

  it("should return the previous non-blacklisted config", () => {
    const config1: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: false,
    };

    const config2: HistoricalConfig = {
      configHash: "hash2",
      updateHash: "update2",
      blacklisted: true,
    };

    const config3: HistoricalConfig = {
      configHash: "hash3",
      updateHash: "update3",
      blacklisted: false,
    };

    configHistory.add(config1);
    configHistory.add(config2);
    configHistory.add(config3);

    const previousNonBlacklistedConfig =
      configHistory.previousNonBlacklistedConfig();

    expect(previousNonBlacklistedConfig).toEqual(config3);
  });

  it("should return null if all configs are blacklisted", () => {
    const config1: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: true,
    };

    const config2: HistoricalConfig = {
      configHash: "hash2",
      updateHash: "update2",
      blacklisted: true,
    };

    configHistory.add(config1);
    configHistory.add(config2);

    const previousNonBlacklistedConfig =
      configHistory.previousNonBlacklistedConfig();

    expect(previousNonBlacklistedConfig).toBeNull();
  });

  it("should return null if no configs exist", () => {
    const previousNonBlacklistedConfig =
      configHistory.previousNonBlacklistedConfig();
    expect(previousNonBlacklistedConfig).toBeNull();
  });

  it("should add new elements at the beginning of the history array", () => {
    const config1: HistoricalConfig = {
      configHash: "hash1",
      updateHash: "update1",
      blacklisted: false,
    };

    const config2: HistoricalConfig = {
      configHash: "hash2",
      updateHash: "update2",
      blacklisted: false,
    };

    const config3: HistoricalConfig = {
      configHash: "hash3",
      updateHash: "update3",
      blacklisted: false,
    };

    configHistory.add(config1);
    configHistory.add(config2);
    configHistory.add(config3);

    expect(configHistory["history"][0]).toEqual(config3);
    expect(configHistory["history"][1]).toEqual(config2);
    expect(configHistory["history"][2]).toEqual(config1);
  });
});
