import { ValuesForDataFeeds } from "@redstone-finance/sdk";
import { expect } from "chai";
import { RelayerConfig } from "../../src";
import { shouldUpdate } from "../../src/price-feeds/should-update";
import {
  createNumberFromContract,
  getDataPackagesResponse,
  mockConfig,
} from "../helpers";

describe("should-update", () => {
  let relayerConfig: RelayerConfig;

  before(() => {
    relayerConfig = mockConfig();
  });

  it("should return false if all checks fail", async () => {
    const dataPackages = await getDataPackagesResponse();
    const smallerValueDiff: ValuesForDataFeeds = {
      ETH: createNumberFromContract(1630.99),
      BTC: createNumberFromContract(23011.68),
    };
    const lastUpdateTimestamp = Date.now() - 1;
    const { shouldUpdatePrices, messages } = await shouldUpdate(
      {
        dataPackages,
        dataFromContract: {
          ETH: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: smallerValueDiff.ETH!,
          },
          BTC: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: smallerValueDiff.BTC!,
          },
        },
        uniqueSignersThreshold: 2,
        blockTag: 0,
        baseChecksTimestamp: Date.now(),
      },
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.false;
    expect(messages[0].message).to.match(
      /Not enough time has passed to update prices/
    );
    expect(messages[1].message).to.match(/Value has not deviated enough to/);
  });

  it("should return true if value-deviation check succeed", async () => {
    const dataPackages = await getDataPackagesResponse();
    const biggerValueDiff: ValuesForDataFeeds = {
      ETH: createNumberFromContract(1230.99),
      BTC: createNumberFromContract(13011.68),
    };
    const lastUpdateTimestamp = Date.now() - 1;
    const { shouldUpdatePrices, messages } = await shouldUpdate(
      {
        dataPackages,
        dataFromContract: {
          ETH: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: Date.now() - 1000000,
            lastValue: biggerValueDiff.ETH!,
          },
          BTC: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: Date.now() - 1000000,
            lastValue: biggerValueDiff.BTC!,
          },
        },
        uniqueSignersThreshold: 2,
        blockTag: 0,
        baseChecksTimestamp: Date.now(),
      },
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.true;
    expect(messages[0].message).to.match(
      /Not enough time has passed to update prices/
    );
  });

  it("should return true if time check succeed", async () => {
    const dataPackages = await getDataPackagesResponse();
    const smallerValueDiff: ValuesForDataFeeds = {
      ETH: createNumberFromContract(1630.99),
      BTC: createNumberFromContract(23011.68),
    };
    const lastUpdateTimestamp = Date.now() - 100000;
    const { shouldUpdatePrices, messages } = await shouldUpdate(
      {
        dataPackages,
        dataFromContract: {
          ETH: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: smallerValueDiff.ETH!,
          },
          BTC: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: smallerValueDiff.BTC!,
          },
        },
        uniqueSignersThreshold: 2,
        blockTag: 0,
        baseChecksTimestamp: Date.now(),
      },
      relayerConfig
    );
    expect(shouldUpdatePrices).to.be.true;
    expect(messages[1].message).to.match(
      /Value has not deviated enough to be updated/
    );
  });

  it("should return true for same value when data packages contains custom decimals", async () => {
    const dataPackages = await getDataPackagesResponse([
      { value: 124567, dataFeedId: "ETH", decimals: 0 },
      { value: 1247, dataFeedId: "BTC", decimals: 2 },
    ]);

    const sameValue: ValuesForDataFeeds = {
      ETH: createNumberFromContract(124567, 0),
      BTC: createNumberFromContract(1247, 2),
    };

    const lastUpdateTimestamp = Date.now() - 100000;
    const { messages } = await shouldUpdate(
      {
        dataPackages,
        dataFromContract: {
          ETH: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: sameValue.ETH!,
          },
          BTC: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: lastUpdateTimestamp,
            lastValue: sameValue.BTC!,
          },
        },
        uniqueSignersThreshold: 2,
        blockTag: 0,
        baseChecksTimestamp: Date.now(),
      },
      relayerConfig
    );
    expect(messages[1].message).to.match(
      /Value has not deviated enough to be updated/
    );
  });

  it("should return true for smaller value when data packages contains custom decimals", async () => {
    const relayerConfig = mockConfig({
      dataFeeds: ["ETH"],
    });
    const dataPackages = await getDataPackagesResponse([
      { value: 124567, dataFeedId: "ETH", decimals: 0 },
    ]);

    const sameValue: ValuesForDataFeeds = {
      ETH: createNumberFromContract(Math.floor(124567 * 0.8), 0),
    };

    const lastUpdateTimestamp = Date.now() - 100000;
    const { messages } = await shouldUpdate(
      {
        dataPackages,
        dataFromContract: {
          ETH: {
            lastBlockTimestampMS: lastUpdateTimestamp,
            lastDataPackageTimestampMS: Date.now() + 100000,
            lastValue: sameValue.ETH!,
          },
        },
        uniqueSignersThreshold: 2,
        blockTag: 0,
        baseChecksTimestamp: Date.now(),
      },
      relayerConfig
    );
    expect(messages[0].message).to.match(
      /Enough time has passed to update prices/
    );
  });
});
