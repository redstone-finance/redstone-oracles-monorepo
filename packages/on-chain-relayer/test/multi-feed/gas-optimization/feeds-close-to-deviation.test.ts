import { expect } from "chai";
import { RelayerConfig } from "../../../src/config/RelayerConfig";
import { includeFeedsCloseToDeviation } from "../../../src/multi-feed/gas-optimization/feeds-close-to-deviation";

const mockConfig = (overrides: Partial<RelayerConfig> = {}): RelayerConfig =>
  ({
    dataFeeds: ["ETH", "BTC", "USDC"],
    updateTriggers: {},
    updateConditions: {},
    ...overrides,
  }) as unknown as RelayerConfig;

describe("includeFeedsCloseToDeviation", () => {
  it("should return empty result when no threshold is configured", () => {
    const result = includeFeedsCloseToDeviation(["ETH"], { BTC: 0.9 }, mockConfig());
    expect(result.extraFeedsFromDeviation).to.deep.equal([]);
    expect(result.message).to.equal("");
  });

  it("should not include feeds already in dataFeedsToUpdate", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const result = includeFeedsCloseToDeviation(["ETH"], { ETH: 0.9 }, config);
    expect(result.extraFeedsFromDeviation).to.deep.equal([]);
  });

  it("should not include feeds with deviation below threshold", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.8 });
    const result = includeFeedsCloseToDeviation(["ETH"], { BTC: 0.7 }, config);
    expect(result.extraFeedsFromDeviation).to.deep.equal([]);
    expect(result.message).to.equal("");
  });

  it("should include feeds with deviation exactly at the threshold", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.8 });
    const result = includeFeedsCloseToDeviation(["ETH"], { BTC: 0.8 }, config);
    expect(result.extraFeedsFromDeviation).to.deep.equal(["BTC"]);
    expect(result.message).to.include("BTC");
  });

  it("should include feeds with deviation above the threshold", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const result = includeFeedsCloseToDeviation(["ETH"], { BTC: 0.9 }, config);
    expect(result.extraFeedsFromDeviation).to.deep.equal(["BTC"]);
    expect(result.message).to.include("BTC");
  });

  it("should include all qualifying feeds", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const result = includeFeedsCloseToDeviation(["ETH"], { BTC: 0.9, USDC: 0.3 }, config);
    expect(result.extraFeedsFromDeviation).to.include("BTC");
    expect(result.extraFeedsFromDeviation).not.to.include("USDC");
  });

  it("should not mutate the original dataFeedsToUpdate array", () => {
    const config = mockConfig({ multiFeedAdditionalUpdatesDeviationThreshold: 0.5 });
    const feeds = ["ETH"];
    includeFeedsCloseToDeviation(feeds, { BTC: 0.9 }, config);
    expect(feeds).to.deep.equal(["ETH"]);
  });
});
