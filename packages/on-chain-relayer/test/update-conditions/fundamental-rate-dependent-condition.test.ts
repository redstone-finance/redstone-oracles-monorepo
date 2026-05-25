import { DataPackagesResponse } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { RelayerConfig } from "../../src";
import { fundamentalRateDependentCondition } from "../../src/core/update-conditions/fundamental-rate-dependent-condition";
import { getDataPackagesResponse, mockConfig } from "../helpers";

const MARKET_FEED = "ETH";
const FUNDAMENTAL_FEED = "ETH_FUNDAMENTAL";
const MARKET_PRICE = 1670.99;
const ACCEPTABLE_DEPEG = 1;
const HEARTBEAT_IN_DEPEG_MS = RedstoneCommon.minToMs(5);

const makeFundamentalConfig = (overrides: Partial<RelayerConfig> = {}): RelayerConfig =>
  mockConfig({
    updateConditions: { [MARKET_FEED]: ["fundamental-rate-dependent"] },
    updateTriggers: {
      [MARKET_FEED]: {
        fundamentalRateDependent: {
          fundamentalToken: FUNDAMENTAL_FEED,
          acceptableDepegPercentage: ACCEPTABLE_DEPEG,
          heartbeatInDepegModeInMs: HEARTBEAT_IN_DEPEG_MS,
        },
      },
    },
    ...overrides,
  });

const config = makeFundamentalConfig();

const runCondition = (
  dataPackages: DataPackagesResponse,
  lastBlockTimestampMS = Date.now() - RedstoneCommon.minToMs(15)
) => fundamentalRateDependentCondition(MARKET_FEED, dataPackages, lastBlockTimestampMS, config);

describe("fundamental-rate-dependent-condition", () => {
  describe("when market price is within acceptable range of fundamental", () => {
    it("should not update when deviation is below threshold", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE * 1.005 },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(dataPackages);

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/Not depegged/);
    });

    it("should not update when prices are exactly equal", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(dataPackages);

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/Not depegged/);
    });
  });

  describe("when market price is depegged from fundamental", () => {
    it("should update when deviation exceeds threshold and heartbeat has elapsed", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE * 1.02 },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(
        dataPackages,
        Date.now() - HEARTBEAT_IN_DEPEG_MS
      );

      expect(shouldUpdatePrices).to.be.true;
      expect(messages[0].message).to.match(/Depegged/);
      expect(messages[0].message).to.match(/heartbeat triggered/);
    });

    it("should not update when deviation exceeds threshold but heartbeat has not elapsed", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE * 1.02 },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(dataPackages, Date.now() - 1_000);

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/Depegged/);
      expect(messages[0].message).to.match(/heartbeat not yet reached/);
    });

    it("should handle negative deviation (market below fundamental)", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE * 0.98 },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(
        dataPackages,
        Date.now() - HEARTBEAT_IN_DEPEG_MS - 1_000
      );

      expect(shouldUpdatePrices).to.be.true;
      expect(messages[0].message).to.match(/Depegged/);
      expect(messages[0].message).to.match(/heartbeat triggered/);
    });

    it("should not update when deviation equals acceptableDepegPercentage exactly", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE * 1.01 },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(
        dataPackages,
        Date.now() - HEARTBEAT_IN_DEPEG_MS
      );

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/Not depegged/);
    });

    it("should not update when market feed packages are missing", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: FUNDAMENTAL_FEED, value: MARKET_PRICE },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(dataPackages);

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/missing data packages/);
    });

    it("should not update when fundamental feed packages are missing", async () => {
      const dataPackages = await getDataPackagesResponse([
        { dataFeedId: MARKET_FEED, value: MARKET_PRICE },
      ]);

      const { shouldUpdatePrices, messages } = runCondition(dataPackages);

      expect(shouldUpdatePrices).to.be.false;
      expect(messages[0].message).to.match(/missing data packages/);
    });
  });
});
