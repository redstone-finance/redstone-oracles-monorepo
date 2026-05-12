import { expect } from "chai";
import { RelayerConfig } from "../../../src/config/RelayerConfig";
import { getExtraFeedsToUpdateParams } from "../../../src/multi-feed/gas-optimization/get-extra-feeds";
import { MultiFeedUpdatePricesArgs } from "../../../src/types";

const mockConfig = (overrides: Partial<RelayerConfig> = {}): RelayerConfig =>
  ({
    dataFeeds: ["ETH", "BTC", "USDC"],
    updateTriggers: {
      ETH: { timeSinceLastUpdateInMilliseconds: 3000 },
      BTC: { timeSinceLastUpdateInMilliseconds: 6000 },
      USDC: { timeSinceLastUpdateInMilliseconds: 9000 },
    },
    updateConditions: {},
    ...overrides,
  }) as unknown as RelayerConfig;

const mockArgs = (overrides: Partial<MultiFeedUpdatePricesArgs> = {}): MultiFeedUpdatePricesArgs =>
  ({
    dataFeedsToUpdate: ["ETH"],
    dataFeedsDeviationRatios: {},
    heartbeatUpdates: [],
    ...overrides,
  }) as unknown as MultiFeedUpdatePricesArgs;

describe("getExtraFeedsToUpdateParams", () => {
  it("should return empty extra feeds and 'no additional' message when nothing is configured", () => {
    const result = getExtraFeedsToUpdateParams(mockConfig(), mockArgs());
    expect(result.extraFeedsToUpdate).to.deep.equal([]);
    expect(result.message).to.equal("No additional feeds were included in the update.");
  });

  it("should include feeds from deviation when threshold is configured", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const args = mockArgs({ dataFeedsDeviationRatios: { BTC: 0.8, USDC: 0.3 } });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.extraFeedsToUpdate).to.include("BTC");
    expect(result.extraFeedsToUpdate).not.to.include("USDC");
  });

  it("should include feeds from heartbeat sync when configured", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const args = mockArgs({ heartbeatUpdates: [6000] });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.extraFeedsToUpdate).to.include("BTC");
  });

  it("should combine feeds from both deviation and heartbeat without duplicates", () => {
    const config = mockConfig({
      multiFeedAdditionalUpdatesDeviationThreshold: 0.5,
      multiFeedSyncHeartbeats: true,
    });
    const args = mockArgs({
      dataFeedsDeviationRatios: { BTC: 0.9 },
      heartbeatUpdates: [6000],
    });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.extraFeedsToUpdate).to.include("BTC");
  });

  it("should produce 'additional feeds' message when extra feeds are added via deviation", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const args = mockArgs({ dataFeedsDeviationRatios: { BTC: 0.8 } });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.message).to.include("Additional feeds included in the update to optimize gas");
  });

  it("should produce 'additional feeds' message when extra feeds are added via heartbeat", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const args = mockArgs({ heartbeatUpdates: [6000] });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.message).to.include("Additional feeds included in the update to optimize gas");
  });

  it("should produce 'no additional' message when no feeds qualify for deviation inclusion", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.9 });
    const args = mockArgs({ dataFeedsDeviationRatios: { BTC: 0.5 } });
    const result = getExtraFeedsToUpdateParams(config, args);
    expect(result.message).to.equal("No additional feeds were included in the update.");
    expect(result.extraFeedsToUpdate).to.deep.equal([]);
  });

  it("should not mutate the original dataFeedsToUpdate array in args", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const originalFeeds = ["ETH"];
    const args = mockArgs({
      dataFeedsToUpdate: originalFeeds,
      dataFeedsDeviationRatios: { BTC: 0.9 },
    });
    getExtraFeedsToUpdateParams(config, args);
    expect(originalFeeds).to.deep.equal(["ETH"]);
  });
});
