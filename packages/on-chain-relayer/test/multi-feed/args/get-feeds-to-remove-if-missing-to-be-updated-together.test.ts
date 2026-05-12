import { expect } from "chai";
import { RelayerConfig } from "../../../src/config/RelayerConfig";
import { getFeedsToRemoveIfMissingFeedToBeUpdatedTogether } from "../../../src/multi-feed/args/get-multi-feed-iteration-args";

const mockConfig = (overrides: Partial<RelayerConfig> = {}): RelayerConfig =>
  ({
    dataFeeds: ["ETH", "BTC", "USDC", "USDT"],
    updateTriggers: {},
    updateConditions: {},
    ...overrides,
  }) as unknown as RelayerConfig;

describe("getFeedsToRemoveIfMissingFeedToBeUpdatedTogether", () => {
  it("should return empty array when feedsToBeUpdatedTogether is not configured", () => {
    const config = mockConfig();
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["ETH", "BTC"], [], config);
    expect(result).to.deep.equal([]);
  });

  it("should return empty array when all feeds in every group are present", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["ETH", "BTC"], [], config);
    expect(result).to.deep.equal([]);
  });

  it("should return the group feeds when one feed from a group is missing", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["ETH", "USDC"], [], config);
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
  });

  it("should return the group feeds when all feeds from a group are missing", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["USDC"], [], config);
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
  });

  it("should only return feeds from incomplete groups, not complete ones", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [
        ["ETH", "BTC"],
        ["USDC", "USDT"],
      ],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(
      ["ETH", "BTC", "USDC"],
      [],
      config
    );
    expect(result).not.to.include("ETH");
    expect(result).not.to.include("BTC");
    expect(result).to.include("USDC");
    expect(result).to.include("USDT");
  });

  it("should handle multiple incomplete groups", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [
        ["ETH", "BTC"],
        ["USDC", "USDT"],
      ],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["ETH", "USDC"], [], config);
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
    expect(result).to.include("USDC");
    expect(result).to.include("USDT");
  });

  it("should handle groups with more than two feeds", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC", "USDC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["ETH", "BTC"], [], config);
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
    expect(result).to.include("USDC");
  });

  it("should return all feeds for a group where all members are absent from update list", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(["USDC"], [], config);
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
  });

  it("should remove group feeds when a member is in dataFeedsToUpdate but also in missingDataFeedIds", () => {
    const config = mockConfig({
      feedsToBeUpdatedTogether: [["ETH", "BTC"]],
    });
    const result = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(
      ["ETH", "BTC"],
      ["BTC"],
      config
    );
    expect(result).to.include("ETH");
    expect(result).to.include("BTC");
  });
});
