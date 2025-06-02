import { expect } from "chai";
import { splitRelayerConfig } from "../../src/config/split-relayer-config";
import { expectFeeds, prepareConfig } from "./helpers";

describe("splitRelayerConfig", () => {
  it("should return original config when feedsSplit is undefined", () => {
    const config = prepareConfig({
      dataFeeds: ["feed1", "feed2", "feed3"],
    });

    const result = splitRelayerConfig(config);

    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.equal(config);
  });

  it("should return original config when feedsSplit is empty array", () => {
    const config = prepareConfig({
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [],
    });

    const result = splitRelayerConfig(config);

    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.equal(config);
  });

  it("should split feeds according to feedsSplit configuration", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed4", "feed3"],
      feedsSplit: [["feed1", "feed2"], ["feed3"]],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    expect(result).to.have.lengthOf(3);

    // First split config
    expectFeeds(result[0], ["feed1", "feed2"]);
    expect(result[0].feedsSplit).to.deep.equal(config.feedsSplit);

    // Second split config
    expectFeeds(result[1], ["feed3"]);
    expect(result[1].feedsSplit).to.deep.equal(config.feedsSplit);

    // Original config with remaining feeds
    expectFeeds(result[2], ["feed4"]);
    expect(result[2].feedsSplit).to.deep.equal(config.feedsSplit);
  });

  it("should filter out feeds that are not in original dataFeeds", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      feedsSplit: [
        ["feed1", "feed3"], // feed3 is not in dataFeeds
        ["feed4", "feed2"], // feed4 is not in dataFeeds
      ],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    expect(result).to.have.lengthOf(2);

    // First split config - only feed1 should remain
    expectFeeds(result[0], ["feed1"]);

    // Second split config - only feed2 should remain
    expectFeeds(result[1], ["feed2"]);
  });

  it("should handle all feeds being split (no remaining feeds)", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [["feed1", "feed2"], ["feed3"]],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // Should not include the original config since it has no feeds left
    expect(result).to.have.lengthOf(2);
    expectFeeds(result[0], ["feed1", "feed2"]);
    expectFeeds(result[1], ["feed3"]);
  });

  it("should filter out configs with empty dataFeeds", () => {
    const config = {
      dataFeeds: ["feed1"],
      feedsSplit: [
        ["feed2", "feed3"], // None of these are in dataFeeds
        ["feed1"],
      ],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // First split would have empty dataFeeds, so it should be filtered out
    expect(result).to.have.lengthOf(1);
    expectFeeds(result[0], ["feed1"]);
  });

  it("should handle duplicate feeds in feedsSplit", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [
        ["feed1", "feed2"],
        ["feed1", "feed3"], // feed1 appears again
      ],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    expect(result).to.have.lengthOf(2);
    expectFeeds(result[0], ["feed1", "feed2"]);
    expectFeeds(result[1], ["feed1", "feed3"]);
  });

  it("should preserve other properties in split configs", () => {
    const config = prepareConfig({
      dataFeeds: ["feed1", "feed2"],
      feedsSplit: [["feed1"]],
      someOtherProperty: "value",
      anotherProperty: 123,
    });

    const result = splitRelayerConfig(config);

    expect(result).to.have.lengthOf(2);

    // Check that other properties are preserved in split configs
    expect(result[0].someOtherProperty).to.equal("value");
    expect(result[0].anotherProperty).to.equal(123);
    expect(result[1].someOtherProperty).to.equal("value");
    expect(result[1].anotherProperty).to.equal(123);
  });

  it("should handle empty arrays in feedsSplit", () => {
    const config = {
      dataFeeds: ["feed1", "feed2"],
      feedsSplit: [[], ["feed1"], []],
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // Empty arrays should be filtered out
    expect(result).to.have.lengthOf(2);
    expectFeeds(result[0], ["feed1"]);
    expectFeeds(result[1], ["feed2"]);
  });

  it("should mutate the original config dataFeeds", () => {
    const config = prepareConfig({
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [["feed1"], ["feed2"]],
    });

    splitRelayerConfig(config);

    // Original config dataFeeds should be mutated
    expectFeeds(config, ["feed3"]);
  });

  it("should split all feeds individually when splitAllFeeds is true", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3", "feed4"],
      splitAllFeeds: true,
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // Should create one config per feed
    expect(result).to.have.lengthOf(4);

    // Each config should have only one feed
    expectFeeds(result[0], ["feed1"]);
    expectFeeds(result[1], ["feed2"]);
    expectFeeds(result[2], ["feed3"]);
    expectFeeds(result[3], ["feed4"]);

    // Each config should preserve other properties
    result.forEach((cfg) => {
      expect(cfg.splitAllFeeds).to.equal(true);
    });
  });

  it("should prioritize splitAllFeeds over feedsSplit", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [["feed1", "feed2"]], // This should be ignored
      splitAllFeeds: true,
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // Should split all feeds individually, ignoring feedsSplit
    expect(result).to.have.lengthOf(3);
    expectFeeds(result[0], ["feed1"]);
    expectFeeds(result[1], ["feed2"]);
    expectFeeds(result[2], ["feed3"]);
  });

  it("should handle splitAllFeeds with single feed", () => {
    const config = {
      dataFeeds: ["feed1"],
      splitAllFeeds: true,
    };

    const result = splitRelayerConfig(prepareConfig(config));

    expect(result).to.have.lengthOf(1);
    expectFeeds(result[0], ["feed1"]);
  });

  it("should handle splitAllFeeds false with feedsSplit", () => {
    const config = {
      dataFeeds: ["feed1", "feed2", "feed3"],
      feedsSplit: [["feed1", "feed2"]],
      splitAllFeeds: false,
    };

    const result = splitRelayerConfig(prepareConfig(config));

    // Should use feedsSplit when splitAllFeeds is false
    expect(result).to.have.lengthOf(2);
    expectFeeds(result[0], ["feed1", "feed2"]);
    expectFeeds(result[1], ["feed3"]);
  });
});
