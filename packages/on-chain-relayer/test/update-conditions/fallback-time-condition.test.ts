import { expect } from "chai";
import { RelayerConfig } from "../../src";
import { timeUpdateCondition } from "../../src/core/update-conditions/time-condition";
import { mockConfig } from "../helpers";

describe("fallback-time-condition", () => {
  let relayerConfig: RelayerConfig;

  before(() => {
    relayerConfig = mockConfig({
      fallbackOffsetInMilliseconds: 60_000,
    });
  });

  it("should return false if time diff smaller than interval", () => {
    const lastUpdateTimestamp = Date.now() - 1;
    const { shouldUpdatePrices, messages } = timeUpdateCondition(
      "ETH",
      lastUpdateTimestamp,
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.false;
    expect(messages[0].message).to.match(
      /Time in fallback mode: Not enough time has passed to update prices/
    );
  });

  it("should return false if time diff bigger than interval but less than interval increased by offset", () => {
    const lastUpdateTimestamp = Date.now() - 60999;
    const { shouldUpdatePrices, messages } = timeUpdateCondition(
      "ETH",
      lastUpdateTimestamp,
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.false;
    expect(messages[0].message).to.match(
      /Time in fallback mode: Not enough time has passed to update prices/
    );
  });

  it("should return true if time diff bigger than interval increased by offset", () => {
    const lastUpdateTimestamp = Date.now() - 61000;
    const { shouldUpdatePrices, messages } = timeUpdateCondition(
      "ETH",
      lastUpdateTimestamp,
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.true;
    expect(messages[0].message).to.match(
      /Time in fallback mode: Enough time has passed to update prices/
    );
  });
});
