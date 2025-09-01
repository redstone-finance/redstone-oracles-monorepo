import { expect } from "chai";
import { ContractFacade, RelayerConfig } from "../../src";

describe("ContractFacade.getContractDataOpts", () => {
  it("shouldCheckValueDeviation: returns true when at least one feed has value-deviation condition", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["value-deviation"],
        BTC: ["time"],
      },
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: { valueDeviation: 1 },
        BTC: { timeSinceLastUpdateInMilliseconds: 0 },
      },
    };

    performTest(relayerConfig);
  });

  it("shouldCheckValueDeviation: returns true when multiple feeds have value-deviation condition", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["value-deviation", "time"],
        BTC: ["value-deviation"],
      },
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: { valueDeviation: 0.5, timeSinceLastUpdateInMilliseconds: 0 },
        BTC: { timeSinceLastUpdateInMilliseconds: 0 },
      },
    };

    performTest(relayerConfig);
  });

  it("shouldCheckValueDeviation: returns false when no feeds have value-deviation condition", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["time"],
        BTC: ["cron"],
      },
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 0 },
        BTC: { cron: ["00 12 * * *"] },
      },
    };

    performTest(relayerConfig, false);
  });

  it("canOmitFetchingDataFromContract: returns false when shouldCheckValueDeviation is true", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["value-deviation"],
      },
      dataFeeds: ["ETH"],
      updateTriggers: {
        ETH: { valueDeviation: 1 },
      },
    };

    performTest(relayerConfig);
  });

  it("canOmitFetchingDataFromContract: returns false when no value-deviation and not all feeds have timeSinceLastUpdate = 0", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["time"],
        BTC: ["cron"],
      },
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 0 },
        BTC: { cron: ["00 12 * * *"] },
      },
    };

    performTest(relayerConfig, false, false);
  });

  it("canOmitFetchingDataFromContract: returns false when at least one feed has timeSinceLastUpdate !== 0", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["time"],
        BTC: ["cron"],
      },
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 120 },
        BTC: { cron: ["00 12 * * *"] },
      },
    };

    performTest(relayerConfig, false, false);
  });

  it("canOmitFetchingDataFromContract: returns false when all feeds have timeSinceLastUpdate !== 0", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["time"],
      },
      dataFeeds: ["ETH"],
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 5000 },
      },
    };

    performTest(relayerConfig, false, false);
  });

  it("edge case: handles empty dataFeeds array (shouldCheckValueDeviation=false, canOmitFetchingDataFromContract=true)", () => {
    const relayerConfig = {
      updateConditions: {},
      dataFeeds: [],
      updateTriggers: {},
    };

    performTest(relayerConfig, false, true);
  });

  it("complex scenario: handles mixed conditions correctly (shouldCheckValueDeviation=true, canOmitFetchingDataFromContract=false)", () => {
    const relayerConfig = {
      updateConditions: {
        ETH: ["time"],
        BTC: ["value-deviation", "time"],
        XTZ: ["cron"],
      },
      dataFeeds: ["ETH", "BTC", "XTZ"],
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 0 },
        BTC: { valueDeviation: 0.5, timeSinceLastUpdateInMilliseconds: 0 },
        XTZ: { cron: ["00 12 * * *"] },
      },
    };

    performTest(relayerConfig);
  });

  function performTest(
    relayerConfig: unknown,
    shouldCheckValueDeviation = true,
    canOmitFetchingDataFromContract = false
  ) {
    const result = ContractFacade.getContractDataOpts(
      relayerConfig as Pick<
        RelayerConfig,
        "dataFeeds" | "updateConditions" | "updateTriggers"
      >
    );

    expect(result.shouldCheckValueDeviation).to.equal(
      shouldCheckValueDeviation
    );
    expect(result.canOmitFetchingDataFromContract).to.equal(
      canOmitFetchingDataFromContract
    );
  }
});
