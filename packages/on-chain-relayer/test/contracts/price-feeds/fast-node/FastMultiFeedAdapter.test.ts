import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  FastMultiFeedAdapter,
  FastMultiFeedAdapterMock,
  IFastMultiFeedAdapter,
} from "../../../../typechain-types";
import { getImpersonatedSigner, permutations } from "../../../helpers";

export const AUTHORIZED_UPDATERS = [
  "0xA13f0A8e3CbF4Cd612a5b7E4C24e376Fb0b56A11",
  "0x52c4F9885b93f11055A037CCB8fAb557D38A2234",
  "0xb724E5e8F5E8F9186f7bF6823ddb1fFE9C77b3BD",
  "0x40AE11483d9B1E7F7Ccf56aaf76AdeB8e320d07C",
  "0x92c5e1b7B1467ea836F9c3bFb8fe8297b97f95BD",
];
const DATA_FEED_ID = ethers.utils.formatBytes32String("ETH");

export async function deployAdapter() {
  const adapterFactory = await ethers.getContractFactory(
    "FastMultiFeedAdapterMock"
  );
  const adapter = await adapterFactory.deploy();
  await adapter.deployed();
  return adapter;
}

async function randomPriceTimestamp() {
  return (
    (await time.latest()) * 1_000_000 + Math.floor(Math.random() * 1_000_000)
  );
}

export async function updateByAllNodes(
  adapter: FastMultiFeedAdapter,
  prices: number[]
) {
  let blockTimestamp = await time.latest();
  const blockTimestamps = [];
  const priceTimestamps = [];
  for (let i = 0; i < 5; i++) {
    blockTimestamp += 10;
    blockTimestamps.push(blockTimestamp);
    await time.setNextBlockTimestamp(blockTimestamp);
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
    const price = ethers.utils.parseUnits(String(prices[i]), 8);
    const priceTimestamp = await randomPriceTimestamp();
    priceTimestamps.push(priceTimestamp);
    await adapter
      .connect(updater)
      .updateDataFeedsValues(priceTimestamp, [
        { dataFeedId: DATA_FEED_ID, price },
      ]);
  }
  return { blockTimestamps, priceTimestamps };
}

describe("FastMultiFeedAdapter - updateDataFeedsValues", function () {
  let adapter: FastMultiFeedAdapter;

  before(async function () {
    await network.provider.send("hardhat_reset");
  });

  beforeEach(async function () {
    adapter = await deployAdapter();
  });

  it("should reject unauthorized updater", async function () {
    const [unauthorized] = await ethers.getSigners();
    const timestamp = await randomPriceTimestamp();
    const priceUpdateInput = {
      dataFeedId: DATA_FEED_ID,
      price: ethers.utils.parseUnits("1000", 8),
    };

    await expect(
      adapter
        .connect(unauthorized)
        .updateDataFeedsValues(timestamp, [priceUpdateInput])
    ).to.be.revertedWithCustomError(adapter, "UpdaterNotAuthorised");
  });

  it("should store price data for authorized updater", async function () {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    const price = ethers.utils.parseUnits("1000", 8);
    const timestamp = await randomPriceTimestamp();
    const priceUpdateInput = { dataFeedId: DATA_FEED_ID, price };

    await adapter
      .connect(updater)
      .updateDataFeedsValues(timestamp, [priceUpdateInput]);

    const storedData = await adapter.getUpdaterLastPriceData(0, DATA_FEED_ID);
    expect(storedData.price.toString()).to.equal(price.toString());
    expect(storedData.priceTimestamp).to.equal(timestamp);
  });

  it("should not calculate price with less than 5 updates", async function () {
    // Check that price data is empty initially
    let priceTimestamp =
      await adapter.getDataTimestampFromLatestUpdate(DATA_FEED_ID);
    expect(priceTimestamp).to.equal(0);

    // Update with 4 updaters
    for (let i = 0; i < 4; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const price = ethers.utils.parseUnits(`100${i}`, 8);
      const timestamp = await randomPriceTimestamp();
      const priceUpdateInput = { dataFeedId: DATA_FEED_ID, price };

      await adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [priceUpdateInput]);
    }

    // Check that price data is still empty
    priceTimestamp =
      await adapter.getDataTimestampFromLatestUpdate(DATA_FEED_ID);
    expect(priceTimestamp).to.equal(0);

    // Update with the 5th updater
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[4]);
    const price = ethers.utils.parseUnits("104", 8);
    const timestamp = await randomPriceTimestamp();
    const priceUpdateInput = { dataFeedId: DATA_FEED_ID, price };

    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [priceUpdateInput])
    ).to.emit(adapter, "RoundCreated");

    // Check that price data is now set
    const updateDetails = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(updateDetails.lastDataTimestamp).to.be.gt(0);
    expect(updateDetails.lastValue).to.be.gt(0);
  });

  it("should use median when latest price deviates too much", async function () {
    // Prepare test data where latest price deviates more than 1%
    const prices = [100, 101, 102, 103, 150];

    // Submit all 5 price updates
    await updateByAllNodes(adapter, prices);

    // Get the calculated price - should use median (103) not latest (110)
    const updateDetails = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    const expectedMedian = ethers.utils.parseUnits("103", 8);
    expect(updateDetails.lastValue).to.equal(expectedMedian);
  });

  it("should use latest price when within deviation threshold", async function () {
    // Prepare test data where latest price is within 1% deviation
    const prices = [100, 101, 102, 103, 103];

    // Submit all 5 price updates
    await updateByAllNodes(adapter, prices);

    // Get the calculated price - should use latest (103) not median (102)
    const lastUpdate = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    const expectedLatest = ethers.utils.parseUnits("103", 8);
    expect(lastUpdate.lastValue).to.equal(expectedLatest);
  });

  it("should reject update with same timestamp and not overwrite previous price data", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[1]);
    const timestamp = await randomPriceTimestamp();

    const price1 = ethers.utils.parseUnits("1000", 8);
    const price2 = ethers.utils.parseUnits("1100", 8);

    // First update should succeed
    await adapter
      .connect(updater)
      .updateDataFeedsValues(timestamp, [
        { dataFeedId: DATA_FEED_ID, price: price1 },
      ]);

    let stored = await adapter.getUpdaterLastPriceData(1, DATA_FEED_ID);
    expect(stored.price).to.equal(price1);
    expect(stored.priceTimestamp).to.equal(timestamp);

    // Second update with the same timestamp should be rejected
    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [
          { dataFeedId: DATA_FEED_ID, price: price2 },
        ])
    ).to.emit(adapter, "UpdateSkipDueToDataTimestamp");

    // Ensure data was not overwritten
    stored = await adapter.getUpdaterLastPriceData(1, DATA_FEED_ID);
    expect(stored.price).to.equal(price1);
    expect(stored.priceTimestamp).to.equal(timestamp);
  });

  it("should emit UpdateSkipDueToBlockTimestamp when block timestamp is not increasing", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[3]);
    const price1 = ethers.utils.parseUnits("1000", 8);
    const price2 = ethers.utils.parseUnits("1100", 8);
    const priceTimestamp1 = await randomPriceTimestamp();

    // pause automining
    await network.provider.send("evm_setAutomine", [false]);

    // First update
    await adapter
      .connect(updater)
      .updateDataFeedsValues(priceTimestamp1, [
        { dataFeedId: DATA_FEED_ID, price: price1 },
      ]);

    // Second update at same block timestamp
    const priceTimestamp2 = priceTimestamp1 + 1; // valid new data timestamp

    const secondUpdateTx = await adapter
      .connect(updater)
      .updateDataFeedsValues(priceTimestamp2, [
        { dataFeedId: DATA_FEED_ID, price: price2 },
      ]);

    // resume automining
    await network.provider.send("evm_setAutomine", [true]);
    await network.provider.send("evm_mine");

    // Confirm data was not overwritten
    const stored = await adapter.getUpdaterLastPriceData(3, DATA_FEED_ID);
    expect(stored.price).to.equal(price1);
    expect(stored.priceTimestamp).to.equal(priceTimestamp1);

    // Check that tx2 emitted UpdateSkipDueToBlockTimestamp
    const receipt = await secondUpdateTx.wait();
    const event = receipt.events?.find(
      (e) => e.event === "UpdateSkipDueToBlockTimestamp"
    );
    expect(event).to.not.be.undefined;
    expect(event?.args?.[0]).to.equal(DATA_FEED_ID);
  });

  it("should allow batch updating multiple dataFeedIds in one call", async function () {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[2]);
    const timestamp = await randomPriceTimestamp();

    const inputs = [
      {
        dataFeedId: ethers.utils.formatBytes32String("ETH"),
        price: ethers.utils.parseUnits("1000", 8),
      },
      {
        dataFeedId: ethers.utils.formatBytes32String("BTC"),
        price: ethers.utils.parseUnits("30000", 8),
      },
      {
        dataFeedId: ethers.utils.formatBytes32String("USDT"),
        price: ethers.utils.parseUnits("7", 8),
      },
    ];

    await adapter.connect(updater).updateDataFeedsValues(timestamp, inputs);

    for (const input of inputs) {
      const stored = await adapter.getUpdaterLastPriceData(2, input.dataFeedId);
      expect(stored.price).to.equal(input.price);
      expect(stored.priceTimestamp).to.equal(timestamp);
    }
  });

  it("should handle batch update of multiple feeds by multiple updaters correctly", async () => {
    const feeds = [
      ethers.utils.formatBytes32String("ETH"),
      ethers.utils.formatBytes32String("BTC"),
      ethers.utils.formatBytes32String("USDT"),
      ethers.utils.formatBytes32String("LINK"),
      ethers.utils.formatBytes32String("MATIC"),
    ];
    const baseTimestamp = await randomPriceTimestamp();

    for (let i = 0; i < AUTHORIZED_UPDATERS.length; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const inputs = feeds.map((feedId, idx) => ({
        dataFeedId: feedId,
        price: ethers.utils.parseUnits((1000 + i * 10 + idx).toString(), 8),
      }));

      await adapter
        .connect(updater)
        .updateDataFeedsValues(baseTimestamp + i, inputs);
    }

    for (const feedId of feeds) {
      const latestRoundId = await adapter.getLatestRoundId(feedId);
      expect(latestRoundId.toString()).to.equal("1");

      // Latest price should correspond to last updater's price for that feed
      const latestPrice = ethers.utils.parseUnits(
        (1000 + 4 * 10 + feeds.indexOf(feedId)).toString(),
        8
      );
      expect(await adapter.getValueForDataFeed(feedId)).to.equal(latestPrice);
    }
  });

  it("should handle updates for multiple distinct dataFeedIds independently", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[3]);
    const timestamp = await randomPriceTimestamp();

    const feedIds = [
      ethers.utils.formatBytes32String("ETH"),
      ethers.utils.formatBytes32String("BTC"),
      ethers.utils.formatBytes32String("USDT"),
    ];

    const prices = [
      ethers.utils.parseUnits("3000", 8),
      ethers.utils.parseUnits("100000", 8),
      ethers.utils.parseUnits("1", 8),
    ];

    for (let i = 0; i < feedIds.length; i++) {
      await adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [
          { dataFeedId: feedIds[i], price: prices[i] },
        ]);
    }

    for (let i = 0; i < feedIds.length; i++) {
      const storedData = await adapter.getUpdaterLastPriceData(3, feedIds[i]);
      expect(storedData.price).to.equal(prices[i]);
    }
  });

  it("should do nothing when given an empty input array", async function () {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    const timestamp = await randomPriceTimestamp();
    await expect(adapter.connect(updater).updateDataFeedsValues(timestamp, []))
      .to.not.be.reverted;
  });

  it("should reject outdated price data update", async function () {
    // Submit 5 price updates
    const prices = [1000, 1001, 1002, 1003, 1004];
    const { blockTimestamps } = await updateByAllNodes(adapter, prices);
    const lastUpdate = await adapter.getLastUpdateDetails(DATA_FEED_ID);

    // Attempt to update with older timestamp
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    const outdatedTimestamp = (blockTimestamps[0] - 30) * 1_000_000;
    const price = ethers.utils.parseUnits("900", 8);
    const outdatedPriceInput = {
      dataFeedId: DATA_FEED_ID,
      price,
    };

    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(outdatedTimestamp, [outdatedPriceInput])
    ).to.emit(adapter, "UpdateSkipDueToDataTimestamp");

    // Value should remain unchanged
    const lastUpdateAfter = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastUpdate.lastValue).to.equal(lastUpdateAfter.lastValue);
    expect(lastUpdate.lastDataTimestamp).to.equal(
      lastUpdateAfter.lastDataTimestamp
    );
    expect(lastUpdate.lastBlockTimestamp).to.equal(
      lastUpdateAfter.lastBlockTimestamp
    );
  });

  it("should accept update at exact max future timestamp and reject if exceeds", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    let blockTimestamp = await time.latest();

    const priceInput = {
      dataFeedId: DATA_FEED_ID,
      price: ethers.utils.parseUnits("1000", 8),
    };

    // Should accept timestamp exactly at allowed future boundary
    blockTimestamp += 5;
    await time.setNextBlockTimestamp(blockTimestamp);
    const exactAllowedTimestamp = (blockTimestamp + 60) * 1_000_000;
    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(exactAllowedTimestamp, [priceInput])
    ).to.not.be.reverted;

    // Should reject timestamp that exceeds allowed future boundary by 1 ms
    blockTimestamp += 5;
    await time.setNextBlockTimestamp(blockTimestamp);
    // MAX_DATA_TIMESTAMP_AHEAD_SECONDS = 1 minute
    const tooFarTimestamp = (blockTimestamp + 60) * 1_000_000 + 1;
    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(tooFarTimestamp, [priceInput])
    ).to.emit(adapter, "UpdateSkipDueToDataTimestamp");
  });

  it("should reject price update with zero price", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    const timestamp = await randomPriceTimestamp();
    const priceUpdateInput = { dataFeedId: DATA_FEED_ID, price: 0 };

    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [priceUpdateInput])
    ).to.emit(adapter, "UpdateSkipDueToInvalidValue");
  });

  it("should not aggregate if any price is zero and emit InvalidPriceData event", async () => {
    // Update 4 authorized updaters with valid prices
    for (let i = 0; i < 4; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const timestamp = await randomPriceTimestamp();
      const price = ethers.utils.parseUnits("1000", 8);
      await adapter
        .connect(updater)
        .updateDataFeedsValues(timestamp, [
          { dataFeedId: DATA_FEED_ID, price },
        ]);
    }

    // The 5th updater sends zero price, should emit InvalidPriceData event
    const badUpdater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[4]);
    const badTimestamp = await randomPriceTimestamp();
    const zeroPrice = ethers.constants.Zero;

    await expect(
      adapter
        .connect(badUpdater)
        .updateDataFeedsValues(badTimestamp, [
          { dataFeedId: DATA_FEED_ID, price: zeroPrice },
        ])
    ).to.emit(adapter, "UpdateSkipDueToInvalidValue");

    // Confirm no new round created because of invalid 5th update
    expect(await adapter.getLatestRoundId(DATA_FEED_ID)).to.equal(0);
  });

  it("should revert getLastUpdateDetails if data is stale", async () => {
    // Submit 5 price updates
    const prices = [1000, 1001, 1002, 1003, 1004];
    await updateByAllNodes(adapter, prices);

    // Advance blockchain by more than MAX_DATA_STALENESS (e.g., 31 hours)
    const blockTimestamp = await time.latest();
    await time.setNextBlockTimestamp(blockTimestamp + 31 * 3600);
    await mine();
    await expect(
      adapter.getLastUpdateDetails(DATA_FEED_ID)
    ).to.be.revertedWithCustomError(adapter, "InvalidLastUpdateDetails");
  });

  it("should handle large batch updates with many dataFeedIds", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[4]);
    const timestamp = await randomPriceTimestamp();

    // Prepare 200 unique dataFeedIds
    const inputs = [];
    for (let i = 0; i < 200; i++) {
      inputs.push({
        dataFeedId: ethers.utils.formatBytes32String(`FEED_${i}`),
        price: ethers.utils.parseUnits((1000 + i).toString(), 8),
      });
    }

    // Should not revert for large batch update
    await expect(
      adapter.connect(updater).updateDataFeedsValues(timestamp, inputs)
    ).to.not.be.reverted;

    // check feed data correctness
    for (let i = 0; i < 200; i++) {
      const feedId = ethers.utils.formatBytes32String(`FEED_${i}`);
      const storedData = await adapter.getUpdaterLastPriceData(4, feedId);
      expect(storedData.price.toString()).to.equal(
        ethers.utils.parseUnits((1000 + i).toString(), 8).toString()
      );
      expect(storedData.priceTimestamp).to.equal(timestamp);
    }
  });

  it("should revert when calling updateDataFeedsValuesPartial", async () => {
    await expect(
      adapter.updateDataFeedsValuesPartial([DATA_FEED_ID])
    ).to.be.revertedWithCustomError(adapter, "UnsupportedFunctionCall");
  });
});

describe("FastMultiFeedAdapter - rounds data", function () {
  let adapter: FastMultiFeedAdapter;

  beforeEach(async function () {
    adapter = await deployAdapter();
  });

  it("should return zero or default values for feed with no updates", async () => {
    expect(await adapter.getLatestRoundId(DATA_FEED_ID)).to.equal(0);
    expect(await adapter.getValueForDataFeed(DATA_FEED_ID)).to.equal(0);
    expect(
      await adapter.getDataTimestampFromLatestUpdate(DATA_FEED_ID)
    ).to.equal(0);
    expect(
      await adapter.getBlockTimestampFromLatestUpdate(DATA_FEED_ID)
    ).to.equal(0);
  });

  it("should increase latestRoundId on each full update", async function () {
    const prices = [1000, 1001, 1002, 1003, 1004];
    await updateByAllNodes(adapter, prices);
    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId.toString()).to.equal("1"); // new round only when all nodes send the price

    await updateByAllNodes(adapter, prices);
    const latestRoundId2 = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId2).to.equal(6); // 5 new rounds
  });

  it("getRoundData should revert with specific custom errors for invalid roundIds", async function () {
    // Zero roundId should revert with RoundIdIsZero
    await expect(
      adapter.getRoundData(DATA_FEED_ID, 0)
    ).to.be.revertedWithCustomError(adapter, "RoundIdIsZero");

    // roundId > latestRoundId should revert with RoundIdTooHigh
    await expect(
      adapter.getRoundData(DATA_FEED_ID, 10)
    ).to.be.revertedWithCustomError(adapter, "RoundIdTooHigh");

    // Create valid data to move latestRoundId forward
    const prices = [1000, 1001, 1002, 1003, 1004];
    await updateByAllNodes(adapter, prices); // Round 1
    await updateByAllNodes(adapter, prices); // Rounds 2–6

    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);

    // MAX_HISTORY_SIZE = 10
    const tooOldRoundId = latestRoundId.toNumber() + 1 - 10;

    // If tooOldRoundId >= 1, we expect a revert with RoundIdTooOld
    if (tooOldRoundId >= 1) {
      await expect(
        adapter.getRoundData(DATA_FEED_ID, tooOldRoundId)
      ).to.be.revertedWithCustomError(adapter, "RoundIdTooOld");
    }
  });

  it("getRoundData should return correct data for a valid round", async function () {
    // First batch of updates to create round 1
    const prices = [1000, 1001, 1004, 1003, 1002];
    const { blockTimestamps, priceTimestamps } = await updateByAllNodes(
      adapter,
      prices
    );

    const roundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    const roundData = await adapter.getRoundData(DATA_FEED_ID, roundId);

    expect(roundId).to.equal(1);
    expect(roundData.price).to.equal(100200000000);
    expect(roundData.priceTimestamp.toNumber()).to.equal(priceTimestamps[4]);
    expect(roundData.blockTimestamp.toNumber()).to.equal(
      blockTimestamps[4] * 1_000_000
    );
  });

  it("should return correct roundData for earliest and latest roundIds", async () => {
    const prices = [1000, 1010, 1020, 1030, 1040];
    await updateByAllNodes(adapter, prices);

    const firstRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(firstRoundId.toString()).to.equal("1");

    // Let's do a second full set of updates
    const nextPrices = [1100, 1110, 1120, 1130, 1140];
    await updateByAllNodes(adapter, nextPrices);

    const secondRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(secondRoundId).to.equal(6); // 1 + 5 more

    const first = await adapter.getRoundData(DATA_FEED_ID, 1);
    const last = await adapter.getRoundData(DATA_FEED_ID, 6);

    expect(first.price).to.equal(ethers.utils.parseUnits("1040", 8));
    expect(last.price).to.equal(ethers.utils.parseUnits("1140", 8));
  });
});

describe("FastMultiFeedAdapter - max history size", function () {
  let adapter: FastMultiFeedAdapter;

  beforeEach(async function () {
    adapter = await deployAdapter(); // Mock with MAX_HISTORY_SIZE = 10
  });

  it("should store only the latest MAX_HISTORY_SIZE rounds and overwrite the oldest", async () => {
    const prices = [1000, 1001, 1002, 1003, 1004];

    // First call: creates 1 round
    await updateByAllNodes(
      adapter,
      prices.map((p) => p + 0)
    );

    // Next 3 calls: each creates 5 rounds => 1 + 3 * 5 = 16 rounds total
    for (let i = 1; i <= 3; i++) {
      await updateByAllNodes(
        adapter,
        prices.map((p) => p + i)
      );
    }

    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId.toNumber()).to.equal(16);

    // Only rounds 7–16 should be accessible
    await expect(
      adapter.getRoundData(DATA_FEED_ID, 6)
    ).to.be.revertedWithCustomError(adapter, "RoundIdTooOld");

    const validRound = await adapter.getRoundData(DATA_FEED_ID, 7);
    expect(validRound.price).to.be.gt(0);
  });

  it("should correctly overwrite buffer slots using modulo indexing", async () => {
    const prices = [2000, 2001, 2002, 2003, 2004];

    await updateByAllNodes(
      adapter,
      prices.map((p) => p + 0)
    ); // round 1
    await updateByAllNodes(
      adapter,
      prices.map((p) => p + 1)
    ); // rounds 2–6
    await updateByAllNodes(
      adapter,
      prices.map((p) => p + 2)
    ); // rounds 7–11

    const roundIdToCheck = 6;
    const dataBeforeOverwrite = await adapter.getRoundData(
      DATA_FEED_ID,
      roundIdToCheck
    );

    // Add more rounds that overwrite previous data
    await updateByAllNodes(
      adapter,
      prices.map((p) => p + 3)
    ); // rounds 12–16

    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId.toNumber()).to.equal(16);

    // Round 6 should now be invalid (evicted)
    await expect(
      adapter.getRoundData(DATA_FEED_ID, roundIdToCheck)
    ).to.be.revertedWithCustomError(adapter, "RoundIdTooOld");

    // Slot 6 in buffer (roundId % 10) now holds data for round 16
    const dataNow = await adapter.getRoundData(DATA_FEED_ID, 16);
    expect(dataNow.price).to.not.equal(dataBeforeOverwrite.price);
  });

  it("should create exactly 1 + (n - 1) * 5 rounds", async () => {
    const prices = [3000, 3001, 3002, 3003, 3004];
    const n = 7; // number of updateByAllNodes calls

    for (let i = 0; i < n; i++) {
      await updateByAllNodes(
        adapter,
        prices.map((p) => p + i)
      );
    }

    const expectedRounds = 1 + (n - 1) * 5;
    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId).to.equal(expectedRounds);
  });
});

describe("FastMultiFeedAdapter - median or last of latest three", function () {
  let adapter: FastMultiFeedAdapterMock;

  beforeEach(async function () {
    adapter = await deployAdapter();
  });

  async function getPermutedResults(
    prices: number[],
    adapter: FastMultiFeedAdapterMock
  ) {
    expect(prices).to.length(5);
    const blockTimestamp = await time.latest();
    const priceTimestamps = Array.from(
      { length: prices.length },
      (_, i) => blockTimestamp - prices.length + i
    );
    const results = [];
    for (const permutedPrices of permutations(prices)) {
      const input = permutedPrices.map((price, index) => ({
        price: ethers.utils.parseUnits(String(price), 8),
        priceTimestamp: priceTimestamps[index],
        blockTimestamp,
      }));
      const result = await adapter._medianOrLastOfLatestThree(
        input as [
          IFastMultiFeedAdapter.PriceDataStruct,
          IFastMultiFeedAdapter.PriceDataStruct,
          IFastMultiFeedAdapter.PriceDataStruct,
          IFastMultiFeedAdapter.PriceDataStruct,
          IFastMultiFeedAdapter.PriceDataStruct,
        ]
      );
      results.push({ input, result });
    }
    return results;
  }

  it("returns median when latest deviates too much", async () => {
    // all values differing by more than the deviation
    const prices = [100, 200, 300, 400, 500];

    const permutedResults = await getPermutedResults(prices, adapter);
    for (const { input, result } of permutedResults) {
      expect(result.price.toNumber()).to.equal(
        // median of the last three
        input
          .slice(2, 5)
          .map((priceData) => priceData.price.toNumber())
          .sort()[1]
      );
    }
  });

  it("returns last when latest does not deviate more than 1%", async () => {
    // prices are close to each other, differences are within 1%
    const prices = [100, 100.5, 100.7, 99.8, 100.2];

    const permutedResults = await getPermutedResults(prices, adapter);
    for (const { input, result } of permutedResults) {
      const expectedLast = input[4].price.toNumber();
      expect(result.price.toNumber()).to.equal(expectedLast);
    }
  });
});
