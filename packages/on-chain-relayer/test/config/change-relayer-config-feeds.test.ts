import { expect } from "chai";
import { changeRelayerConfigFeeds } from "../../src/config/change-relayer-config-feeds";
import { ConditionCheckNames } from "../../src/config/RelayerConfig";
import { prepareConfig } from "./helpers";

describe("changeRelayerConfigFeeds", () => {
  it("should filter updateTriggers to only include new dataFeeds", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
        feed2: { timeSinceLastUpdateInMilliseconds: 1000 },
        feed3: { cron: ["* * * * *"] },
      },
      updateConditions: {
        feed1: ["value-deviation"] as ConditionCheckNames[],
        feed2: ["time"] as ConditionCheckNames[],
        feed3: ["cron"] as ConditionCheckNames[],
      },
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), [
      "feed1",
      "feed3",
    ]);

    expect(result.updateTriggers).to.deep.equal({
      feed1: { deviationPercentage: 0.5 },
      feed3: { cron: ["* * * * *"] },
    });
  });

  it("should handle empty dataFeeds array", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
        feed2: { timeSinceLastUpdateInMilliseconds: 1000 },
      },
      updateConditions: {
        feed1: ["time"] as ConditionCheckNames[],
        feed2: ["value-deviation"] as ConditionCheckNames[],
      },
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), []);

    expect(result.dataFeeds).to.deep.equal([]);
    expect(result.updateTriggers).to.deep.equal({});
    expect(result.updateConditions).to.deep.equal({});
  });

  it("should add new feeds that were not in original config", () => {
    const config = {
      dataFeeds: ["feed1"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
      },
      updateConditions: {
        feed1: ["time"] as ConditionCheckNames[],
      },
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), [
      "feed1",
      "feed2",
      "feed3",
    ]);

    expect(result.dataFeeds).to.deep.equal(["feed1", "feed2", "feed3"]);
    // Only feed1 should have triggers/conditions since feed2/feed3 weren't in original
    expect(result.updateTriggers).to.deep.equal({
      feed1: { deviationPercentage: 0.5 },
    });
    expect(result.updateConditions).to.deep.equal({
      feed1: ["time"],
    });
  });

  it("should mutate the original config object", () => {
    const config = prepareConfig({
      dataFeeds: ["feed1", "feed2"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
      },
      updateConditions: {},
    });

    const result = changeRelayerConfigFeeds(config, ["feed1"]);

    // Should return the same object reference
    expect(result).to.equal(config);
    // Original object should be mutated
    expect(config.dataFeeds).to.deep.equal(["feed1"]);
  });

  it("should preserve other properties not related to feeds", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      updateTriggers: {},
      updateConditions: {},
      splitAllFeeds: true,
      feedsSplit: [["feed1"], ["feed2"]],
      someOtherProperty: "value",
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), ["feed1"]);

    expect(result.splitAllFeeds).to.equal(true);
    expect(result.feedsSplit).to.deep.equal([["feed1"], ["feed2"]]);
    expect(result.someOtherProperty).to.equal("value");
  });

  it("should handle updateTriggers with feeds not in new dataFeeds", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
        feed2: { timeSinceLastUpdateInMilliseconds: 1000 },
        feed3: { cron: ["* * * * *"] }, // feed3 not in dataFeeds
      },
      updateConditions: {},
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), [
      "feed2",
      "feed3",
    ]);

    // Should only include feed2, since feed3 wasn't in original triggers
    expect(result.updateTriggers).to.deep.equal({
      feed2: { timeSinceLastUpdateInMilliseconds: 1000 },
      feed3: { cron: ["* * * * *"] },
    });
  });

  it("should handle duplicate feeds in new dataFeeds array", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      updateTriggers: {
        feed1: { deviationPercentage: 0.5 },
      },
      updateConditions: {
        feed1: ["time"] as ConditionCheckNames[],
      },
    };

    const result = changeRelayerConfigFeeds(prepareConfig(config), [
      "feed1",
      "feed1",
      "feed2",
    ]);

    // Duplicates should be preserved in dataFeeds
    expect(result.dataFeeds).to.deep.equal(["feed1", "feed1", "feed2"]);
    // But triggers/conditions should still work correctly
    expect(result.updateTriggers).to.deep.equal({
      feed1: { deviationPercentage: 0.5 },
    });
  });
});
