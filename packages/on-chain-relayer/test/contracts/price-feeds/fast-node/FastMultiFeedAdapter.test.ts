import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumberish, utils } from "ethers";
import { ethers, network } from "hardhat";
import { FastMultiFeedAdapter, FastMultiFeedAdapterMock } from "../../../../typechain-types";
import { getImpersonatedSigner, permutations } from "../../../helpers";

/**
 * Authorized updaters as wired in FastMultiFeedAdapterMock.getAuthorisedUpdaterId()
 */
export const AUTHORIZED_UPDATERS = [
  "0xA13f0A8e3CbF4Cd612a5b7E4C24e376Fb0b56A11",
  "0x52c4F9885b93f11055A037CCB8fAb557D38A2234",
  "0xb724E5e8F5E8F9186f7bF6823ddb1fFE9C77b3BD",
  "0x40AE11483d9B1E7F7Ccf56aaf76AdeB8e320d07C",
  "0x92c5e1b7B1467ea836F9c3bFb8fe8297b97f95BD",
];

const DATA_FEED_ID = utils.formatBytes32String("ETH");

/** Deploys the mock (history size = 10) */
export async function deployAdapter() {
  const factory = await ethers.getContractFactory("FastMultiFeedAdapterMock");
  const adapter = await factory.deploy();
  await adapter.deployed();
  return adapter;
}

/** Converts seconds to microseconds used by the contract */
function toMicros(blockTs: number) {
  return blockTs * 1_000_000;
}

/**
 * Helper: make 5 updates (one per authorized updater), each one second apart.
 * This guarantees all 5 updates are "fresh" (≤ 10s window) and that block
 * timestamps are strictly increasing (Hardhat requirement).
 */
export async function updateByAllNodesFresh(
  adapter: FastMultiFeedAdapter,
  prices: number[],
  feedId: string = DATA_FEED_ID
) {
  expect(prices.length).to.equal(5);
  const base = (await time.latest()) + 1; // ensure strictly > previous block

  const blockTimestamps: number[] = [];
  const priceTimestamps: number[] = [];

  for (let i = 0; i < 5; i++) {
    const blockTs = base + i;
    await time.setNextBlockTimestamp(blockTs);
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
    const price = utils.parseUnits(String(prices[i]), 8);
    const priceTimestamp = toMicros(blockTs);

    await adapter
      .connect(updater)
      .updateDataFeedsValues(priceTimestamp, [{ dataFeedId: feedId, price }]);

    blockTimestamps.push(blockTs);
    priceTimestamps.push(priceTimestamp);
  }

  return { blockTimestamps, priceTimestamps };
}

/**
 * Helper: produce 2 "old" updates and later 3 "fresh" updates without going back in time.
 * We first submit 2 updates, then jump forward by > 10 seconds to make them stale,
 * then provide 3 fresh updates close together.
 */
export async function twoStaleThenThreeFresh(
  adapter: FastMultiFeedAdapter,
  pricesOld: number[],
  pricesFresh: number[],
  feedId: string = DATA_FEED_ID
) {
  expect(pricesOld.length).to.equal(2);
  expect(pricesFresh.length).to.equal(3);

  let now = (await time.latest()) + 1;

  // Two "old" updates at t and t+1
  for (let i = 0; i < 2; i++) {
    const blockTs = now + i;
    await time.setNextBlockTimestamp(blockTs);
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
    const price = utils.parseUnits(String(pricesOld[i]), 8);
    await adapter
      .connect(updater)
      .updateDataFeedsValues(toMicros(blockTs), [{ dataFeedId: feedId, price }]);
  }

  // Jump forward by >= 20s so the above become stale (MAX delay = 10s)
  now = (await time.latest()) + 20;

  // Three fresh updates at now, now+1, now+2 (from the remaining 3 updaters)
  for (let j = 0; j < 3; j++) {
    const blockTs = now + j;
    await time.setNextBlockTimestamp(blockTs);
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[2 + j]);
    const price = utils.parseUnits(String(pricesFresh[j]), 8);
    await adapter
      .connect(updater)
      .updateDataFeedsValues(toMicros(blockTs), [{ dataFeedId: feedId, price }]);
  }
}

describe("FastMultiFeedAdapter", function () {
  let adapter: FastMultiFeedAdapterMock;

  before(async () => {
    await network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    adapter = await deployAdapter();
  });

  it("rejects unauthorized updater", async () => {
    const [unauthorized] = await ethers.getSigners();
    const blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    const ts = toMicros(blockTs);
    const input = {
      dataFeedId: DATA_FEED_ID,
      price: utils.parseUnits("1000", 8),
    };
    await expect(
      adapter.connect(unauthorized).updateDataFeedsValues(ts, [input])
    ).to.be.revertedWithCustomError(adapter, "UpdaterNotAuthorised");
  });

  it("stores last price per updater and feed", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);
    const blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    const ts = toMicros(blockTs);
    const price = utils.parseUnits("1000", 8);

    await adapter.connect(updater).updateDataFeedsValues(ts, [{ dataFeedId: DATA_FEED_ID, price }]);

    const stored = await adapter.getUpdaterLastPriceData(0, DATA_FEED_ID);
    expect(stored.price).to.equal(price);
    expect(stored.priceTimestamp).to.equal(ts);
  });

  it("does NOT create a round if fewer than 3 fresh prices are available", async () => {
    // Submit only 2 fresh updates
    for (let i = 0; i < 2; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const blockTs = (await time.latest()) + 1;
      await time.setNextBlockTimestamp(blockTs);
      await adapter.connect(updater).updateDataFeedsValues(toMicros(blockTs), [
        {
          dataFeedId: DATA_FEED_ID,
          price: utils.parseUnits(String(1000 + i), 8),
        },
      ]);
    }

    expect(await adapter.getLatestRoundId(DATA_FEED_ID)).to.equal(0);
    expect(await adapter.getValueForDataFeed(DATA_FEED_ID)).to.equal(0);
  });

  it("creates a round when at least 3 fresh prices exist (with 2 stale ignored)", async () => {
    await twoStaleThenThreeFresh(adapter, [900, 1100], [1000, 1002, 1004]);
    const latestRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(latestRoundId).to.equal(1);

    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    // median([1000, 1002, 1004]) = 1002
    expect(lastValue).to.equal(utils.parseUnits("1002", 8));
  });

  it("uses median of fresh prices; large outlier is ignored by median", async () => {
    // With plain median (no deadband), after 5 fresh updates [100,101,102,103,1000]
    // the final median is 102.
    await updateByAllNodesFresh(adapter, [100, 101, 102, 103, 1000]);
    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastValue).to.equal(utils.parseUnits("102", 8));
  });

  it("for even fresh count, median is the average of the two middle values", async () => {
    // Bootstrap initial round to establish history.
    await updateByAllNodesFresh(adapter, [100, 100, 100, 100, 100]);
    const r1 = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(r1.lastValue).to.equal(utils.parseUnits("100", 8));

    // Make previous prices stale to ensure we truly have 4 fresh inputs only.
    const jump = (await time.latest()) + 20; // > 10s staleness window
    await time.setNextBlockTimestamp(jump);

    // Provide exactly 4 fresh prices: [10, 20, 30, 40]
    // Even count (4) → median = (20 + 30) / 2 = 25 (no tie-break with last round).
    for (let i = 0; i < 4; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const ts = jump + i;
      await time.setNextBlockTimestamp(ts);
      await adapter
        .connect(updater)
        .updateDataFeedsValues(toMicros(ts), [
          { dataFeedId: DATA_FEED_ID, price: utils.parseUnits(String([10, 20, 30, 40][i]), 8) },
        ]);
    }

    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastValue).to.equal(utils.parseUnits("25", 8));
  });

  it("creates rounds and updates value even for small changes (no deadband)", async () => {
    // Round #1..#3 created by the first fresh batch (on 3rd/4th/5th update).
    await updateByAllNodesFresh(adapter, [100, 100, 100, 100, 100]);

    const beforeRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    const previousPrice = await adapter.getValueForDataFeed(DATA_FEED_ID);
    expect(previousPrice).to.equal(utils.parseUnits("100", 8));

    // Update three distinct updaters with prices slightly > 100.
    // Since the other two updaters still have 100, the final median after the third update is 100.1.
    const medCandidates = [100.1, 100.2, 100.3];
    const base = (await time.latest()) + 2;
    for (let i = 0; i < 3; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const ts = base + i;
      await time.setNextBlockTimestamp(ts);
      await adapter
        .connect(updater)
        .updateDataFeedsValues(toMicros(ts), [
          { dataFeedId: DATA_FEED_ID, price: utils.parseUnits(String(medCandidates[i]), 8) },
        ]);
    }

    const afterRoundId = await adapter.getLatestRoundId(DATA_FEED_ID);
    expect(afterRoundId).to.equal(beforeRoundId.add(3)); // +3 rounds

    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastValue).to.equal(utils.parseUnits("100.1", 8));
  });

  it("rejects zero price; rejects stale/too-future data timestamp; rejects non-increasing block timestamp", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);

    // Zero price
    let blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(toMicros(blockTs), [{ dataFeedId: DATA_FEED_ID, price: 0 }])
    ).to.emit(adapter, "UpdateSkipDueToInvalidValue");

    // Too old (> 10s)
    blockTs = (await time.latest()) + 20;
    await time.setNextBlockTimestamp(blockTs);
    const tooOldTs = toMicros(blockTs - 11);
    await expect(
      adapter.connect(updater).updateDataFeedsValues(tooOldTs, [
        {
          dataFeedId: DATA_FEED_ID,
          price: utils.parseUnits("1000", 8),
        },
      ])
    ).to.emit(adapter, "UpdateSkipDueToDataTimestamp");

    // Exactly +1s ahead → allowed
    blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    const aheadOk = toMicros(blockTs) + 1_000_000;
    await expect(
      adapter.connect(updater).updateDataFeedsValues(aheadOk, [
        {
          dataFeedId: DATA_FEED_ID,
          price: utils.parseUnits("1000", 8),
        },
      ])
    ).to.not.be.reverted;

    // +1 µs beyond limit → rejected
    blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    const aheadTooFar = toMicros(blockTs) + 1_000_000 + 1;
    await expect(
      adapter.connect(updater).updateDataFeedsValues(aheadTooFar, [
        {
          dataFeedId: DATA_FEED_ID,
          price: utils.parseUnits("1000", 8),
        },
      ])
    ).to.emit(adapter, "UpdateSkipDueToDataTimestamp");

    // Non-increasing block timestamp (same block for two tx from the same updater)
    await network.provider.send("evm_setAutomine", [false]);

    const fixedBlockTs = (await time.latest()) + 100; // future block timestamp
    await time.setNextBlockTimestamp(fixedBlockTs);

    const price1 = utils.parseUnits("1", 8);
    const price2 = utils.parseUnits("2", 8);
    const ts1 = toMicros(fixedBlockTs) + 10;
    const ts2 = ts1 + 1; // data ts increases, but block ts will be identical

    const _tx1 = await adapter
      .connect(updater)
      .updateDataFeedsValues(ts1, [{ dataFeedId: DATA_FEED_ID, price: price1 }]);

    const tx2 = await adapter
      .connect(updater)
      .updateDataFeedsValues(ts2, [{ dataFeedId: DATA_FEED_ID, price: price2 }]);

    // Mine exactly one block with the fixed timestamp → both tx share the same block timestamp
    await network.provider.send("evm_mine", [fixedBlockTs]);
    await network.provider.send("evm_setAutomine", [true]);

    // Confirm data was not overwritten and event emitted for the second tx
    const stored = await adapter.getUpdaterLastPriceData(0, DATA_FEED_ID);
    expect(stored.price).to.equal(price1);

    const receipt = await tx2.wait();
    const ev = receipt.events?.find((e) => e.event === "UpdateSkipDueToBlockTimestamp");
    expect(ev).to.not.be.undefined;
    expect(ev?.args?.[0]).to.equal(DATA_FEED_ID);
  });

  it("supports batch updates for multiple feeds in a single call", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[2]);
    const blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);

    const inputs = [
      {
        dataFeedId: utils.formatBytes32String("ETH"),
        price: utils.parseUnits("1000", 8),
      },
      {
        dataFeedId: utils.formatBytes32String("BTC"),
        price: utils.parseUnits("30000", 8),
      },
      {
        dataFeedId: utils.formatBytes32String("USDT"),
        price: utils.parseUnits("7", 8),
      },
    ];

    await adapter.connect(updater).updateDataFeedsValues(toMicros(blockTs), inputs);

    for (const i of inputs) {
      const stored = await adapter.getUpdaterLastPriceData(2, i.dataFeedId);
      expect(stored.price).to.equal(i.price);
      expect(stored.priceTimestamp).to.equal(toMicros(blockTs));
    }
  });

  it("handles concurrent batch updates from multiple updaters; rounds per feed are independent", async () => {
    const feeds = [
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("BTC"),
      utils.formatBytes32String("USDT"),
      utils.formatBytes32String("LINK"),
      utils.formatBytes32String("MATIC"),
    ];

    const base = (await time.latest()) + 2;
    // Every updater submits values for all feeds within a 1-second window → all fresh
    for (let i = 0; i < AUTHORIZED_UPDATERS.length; i++) {
      const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[i]);
      const inputs = feeds.map((feedId, idx) => ({
        dataFeedId: feedId,
        price: utils.parseUnits((1000 + i * 10 + idx).toString(), 8),
      }));
      await time.setNextBlockTimestamp(base + i);
      await adapter.connect(updater).updateDataFeedsValues(toMicros(base + i), inputs);
    }

    for (const feedId of feeds) {
      const latestRoundId = await adapter.getLatestRoundId(feedId);
      expect(latestRoundId).to.be.gt(0);

      // With 5 fresh prices (1000+idx, 1010+idx, 1020+idx, 1030+idx, 1040+idx),
      // the final median is 1020 + idx.
      const expected = 1020 + feeds.indexOf(feedId);
      expect(await adapter.getValueForDataFeed(feedId)).to.equal(
        utils.parseUnits(String(expected), 8)
      );
    }
  });

  it("returns zeros for never-updated feed", async () => {
    expect(await adapter.getLatestRoundId(DATA_FEED_ID)).to.equal(0);
    expect(await adapter.getValueForDataFeed(DATA_FEED_ID)).to.equal(0);
    expect(await adapter.getDataTimestampFromLatestUpdate(DATA_FEED_ID)).to.equal(0);
    expect(await adapter.getBlockTimestampFromLatestUpdate(DATA_FEED_ID)).to.equal(0);
  });

  it("getLastUpdateDetails reverts when data is stale (> 30 minutes)", async () => {
    await updateByAllNodesFresh(adapter, [1000, 1001, 1002, 1003, 1004]);
    const now = await time.latest();
    await time.setNextBlockTimestamp(now + 31 * 60 + 1);
    await mine();
    await expect(adapter.getLastUpdateDetails(DATA_FEED_ID)).to.be.revertedWithCustomError(
      adapter,
      "InvalidLastUpdateDetails"
    );
  });

  it("supports large batch (many feeds) in one call", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[4]);
    const blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);

    const inputs = [];
    for (let i = 0; i < 200; i++) {
      inputs.push({
        dataFeedId: utils.formatBytes32String(`FEED_${i}`),
        price: utils.parseUnits(String(1000 + i), 8),
      });
    }

    await expect(adapter.connect(updater).updateDataFeedsValues(toMicros(blockTs), inputs)).to.not
      .be.reverted;

    for (let i = 0; i < 200; i++) {
      const feedId = utils.formatBytes32String(`FEED_${i}`);
      const stored = await adapter.getUpdaterLastPriceData(4, feedId);
      expect(stored.price).to.equal(utils.parseUnits(String(1000 + i), 8));
      expect(stored.priceTimestamp).to.equal(toMicros(blockTs));
    }
  });

  it("updateDataFeedsValuesPartial reverts with UnsupportedFunctionCall", async () => {
    await expect(
      adapter.updateDataFeedsValuesPartial([DATA_FEED_ID])
    ).to.be.revertedWithCustomError(adapter, "UnsupportedFunctionCall");
  });

  describe("Rounds ring buffer (MAX_HISTORY_SIZE = 10 in the mock)", () => {
    it("keeps only the most recent 10 rounds; older rounds become inaccessible", async () => {
      // Produce many rounds. Every batch creates multiple rounds now.
      let baseVal = 1000;
      for (let i = 0; i < 16; i++) {
        await updateByAllNodesFresh(adapter, [
          baseVal,
          baseVal + 1,
          baseVal + 2,
          baseVal + 3,
          baseVal + 4,
        ]);
        baseVal += 20;
      }

      const latest = await adapter.getLatestRoundId(DATA_FEED_ID);
      // First batch makes 3 rounds, next 15 batches make 5 each => 78 total.
      expect(latest).to.equal(78);

      const maxHistory = 10;
      const oldestKept = latest.sub(maxHistory).add(1); // inclusive
      const tooOld = oldestKept.sub(1);

      // Too old should revert
      await expect(adapter.getRoundData(DATA_FEED_ID, tooOld)).to.be.revertedWithCustomError(
        adapter,
        "RoundIdTooOld"
      );

      // Oldest kept should still be readable
      const valid = await adapter.getRoundData(DATA_FEED_ID, oldestKept);
      expect(valid.price).to.be.gt(0);
    });

    it("correctly overwrites buffer slots using modulo indexing", async () => {
      // Make 11 batches. With the new behavior this yields 53 total rounds:
      // first batch: 3 rounds; next 10 batches: 5 rounds each.
      let baseVal = 2000;
      for (let i = 0; i < 11; i++) {
        await updateByAllNodesFresh(adapter, [
          baseVal,
          baseVal + 1,
          baseVal + 2,
          baseVal + 3,
          baseVal + 4,
        ]);
        baseVal += 50;
      }

      const latest = await adapter.getLatestRoundId(DATA_FEED_ID);
      expect(latest).to.equal(53);

      const maxHistory = 10;
      const oldestKept = latest.sub(maxHistory).add(1); // 44
      const tooOld = oldestKept.sub(1); // 43

      // Round just outside the window is evicted
      await expect(adapter.getRoundData(DATA_FEED_ID, tooOld)).to.be.revertedWithCustomError(
        adapter,
        "RoundIdTooOld"
      );

      // Oldest kept is available
      const rOldestKept = await adapter.getRoundData(DATA_FEED_ID, oldestKept);
      expect(rOldestKept.price).to.be.gt(0);

      // Latest is available and should differ from oldest kept (values jump by +50 per batch)
      const rLatest = await adapter.getRoundData(DATA_FEED_ID, latest);
      expect(rLatest.price).to.not.equal(rOldestKept.price);

      // Optional: push one more batch to force eviction of `oldestKept`
      await updateByAllNodesFresh(adapter, [
        baseVal,
        baseVal + 1,
        baseVal + 2,
        baseVal + 3,
        baseVal + 4,
      ]);
      const latest2 = await adapter.getLatestRoundId(DATA_FEED_ID);
      // +5 rounds due to 5 fresh updates
      expect(latest2).to.equal(latest.add(5));

      // Now `oldestKept` should be evicted
      await expect(adapter.getRoundData(DATA_FEED_ID, oldestKept)).to.be.revertedWithCustomError(
        adapter,
        "RoundIdTooOld"
      );
    });
  });

  describe("Median of prices (exposed via mock)", () => {
    it("returns median for odd count", async () => {
      // Tuple type matches the Solidity signature uint256[NUM_UPDATERS]
      const p: [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish] = [
        utils.parseUnits("100", 8),
        utils.parseUnits("101", 8),
        utils.parseUnits("102", 8),
        utils.parseUnits("103", 8),
        utils.parseUnits("500", 8),
      ];
      const median = await adapter._medianOfPrices(p, 5);
      expect(median).to.equal(utils.parseUnits("102", 8));
    });

    it("returns average of the two middle values for even count", async () => {
      const p: [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish] = [
        utils.parseUnits("100", 8),
        utils.parseUnits("200", 8),
        utils.parseUnits("300", 8),
        utils.parseUnits("400", 8),
        0, // unused, but we must keep tuple length = 5
      ];
      const median = await adapter._medianOfPrices(p, 4); // use first 4
      expect(median).to.equal(utils.parseUnits("250", 8));
    });

    it("odd count = 5 → median = 102 for every permutation", async () => {
      // 5 values (last one is an outlier) → median should be 102
      const values5 = [100, 101, 102, 103, 500];
      const expected = utils.parseUnits("102", 8);

      for (const perm of permutations(values5)) {
        // medianOfPrices expects a fixed-length tuple of size NUM_UPDATERS (5 here)
        const tuple = perm.map((x) => utils.parseUnits(String(x), 8)) as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ];

        const median = await adapter._medianOfPrices(tuple, 5);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("even count = 4 → median = (200+300)/2 = 250 for every permutation", async () => {
      const values4 = [100, 200, 300, 400];
      const expected = utils.parseUnits("250", 8);

      for (const perm of permutations(values4)) {
        // Pad to length 5; the extra element is ignored because count=4
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8),
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];

        const median = await adapter._medianOfPrices(padded, 4);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("odd count = 3 → median = 20 for every permutation", async () => {
      const values3 = [10, 20, 30];
      const expected = utils.parseUnits("20", 8);

      for (const perm of permutations(values3)) {
        // Pad to length 5; extra elements are ignored because count=3
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8),
          utils.parseUnits("0", 8),
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];

        const median = await adapter._medianOfPrices(padded, 3);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("odd count = 5 with duplicates → median = 101 for every permutation", async () => {
      // Multiset: two 100s plus 101, 102, 103 → sorted = [100,100,101,102,103] → median = 101
      const values = [100, 100, 101, 102, 103];
      const expected = utils.parseUnits("101", 8);

      for (const perm of permutations(values)) {
        const tuple = perm.map((x) => utils.parseUnits(String(x), 8)) as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ];
        const median = await adapter._medianOfPrices(tuple, 5);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("even count = 4 with duplicates → median = 200 for every permutation", async () => {
      // Multiset: [100, 100, 300, 400] → sorted middle pair = (100,300) → median = 200
      const values = [100, 100, 300, 400];
      const expected = utils.parseUnits("200", 8);

      for (const perm of permutations(values)) {
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8), // ignored (count=4)
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];
        const median = await adapter._medianOfPrices(padded, 4);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("odd count = 3 with duplicates → median = 20 for every permutation", async () => {
      // Multiset: [20, 20, 30] → median = 20 regardless of order
      const values = [20, 20, 30];
      const expected = utils.parseUnits("20", 8);

      for (const perm of permutations(values)) {
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8),
          utils.parseUnits("0", 8), // ignored (count=3)
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];
        const median = await adapter._medianOfPrices(padded, 3);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });
  });
});
