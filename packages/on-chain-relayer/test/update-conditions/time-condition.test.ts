import { expect } from "chai";
import { RelayerConfig } from "../../src";
import { timeUpdateCondition } from "../../src/core/update-conditions/time-condition";
import { mockConfig } from "../helpers";

describe("time-condition", () => {
  let relayerConfig: RelayerConfig;

  before(() => {
    relayerConfig = mockConfig();
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
      /Not enough time has passed to update prices/
    );
  });

  it("should return true if time diff bigger than interval", () => {
    const lastUpdateTimestamp = Date.now() - 100000;
    const { shouldUpdatePrices, messages } = timeUpdateCondition(
      "ETH",
      lastUpdateTimestamp,
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.true;
    expect(messages[0].message).to.match(
      /Enough time has passed to update prices/
    );
  });
});
