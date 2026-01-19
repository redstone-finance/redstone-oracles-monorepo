import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumberish, utils } from "ethers";
import { ethers, network } from "hardhat";
import { FastMultiFeedAdapterWithoutRoundsMock } from "../../../../typechain-types";
import { getImpersonatedSigner, permutations } from "../../../helpers";
import {
  AUTHORIZED_UPDATERS,
  DATA_FEED_ID,
  toMicros,
  twoStaleThenThreeFresh,
  updateByAllNodesFresh,
} from "./fast-node-test-helpers";

describe("FastMultiFeedAdapterWithoutRounds", function () {
  let adapter: FastMultiFeedAdapterWithoutRoundsMock;

  before(async () => {
    await network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    const factory = await ethers.getContractFactory("FastMultiFeedAdapterWithoutRoundsMock");
    adapter = await factory.deploy();
    await adapter.deployed();
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

  it("does NOT store aggregated value if fewer than 3 fresh prices are available", async () => {
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

    const unsafe = await adapter.getLastUpdateDetailsUnsafe(DATA_FEED_ID);
    expect(unsafe.lastValue).to.equal(0);
    expect(unsafe.lastDataTimestamp).to.equal(0);
    expect(unsafe.lastBlockTimestamp).to.equal(0);
    await expect(adapter.getValueForDataFeed(DATA_FEED_ID)).to.be.revertedWithCustomError(
      adapter,
      "InvalidLastUpdateDetails"
    );
  });

  it("stores value when at least 3 fresh prices exist (with 2 stale ignored)", async () => {
    await twoStaleThenThreeFresh(adapter, [900, 1100], [1000, 1002, 1004]);
    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    // median([1000, 1002, 1004]) = 1002
    expect(lastValue).to.equal(utils.parseUnits("1002", 8));
  });

  it("uses median of fresh prices; large outlier is ignored by median", async () => {
    await updateByAllNodesFresh(adapter, [100, 101, 102, 103, 1000]);
    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastValue).to.equal(utils.parseUnits("102", 8));
  });

  it("for even fresh count, median is the average of the two middle values", async () => {
    await updateByAllNodesFresh(adapter, [100, 100, 100, 100, 100]);
    const r1 = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(r1.lastValue).to.equal(utils.parseUnits("100", 8));

    const jump = (await time.latest()) + 20; // > 10s staleness window
    await time.setNextBlockTimestamp(jump);

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

  it("updates value even for small changes (no deadband)", async () => {
    await updateByAllNodesFresh(adapter, [100, 100, 100, 100, 100]);
    const previousPrice = await adapter.getValueForDataFeed(DATA_FEED_ID);
    expect(previousPrice).to.equal(utils.parseUnits("100", 8));

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

    const { lastValue } = await adapter.getLastUpdateDetails(DATA_FEED_ID);
    expect(lastValue).to.equal(utils.parseUnits("100.1", 8));
  });

  it("rejects zero price; rejects stale/too-future data timestamp; rejects non-increasing block timestamp", async () => {
    const updater = await getImpersonatedSigner(AUTHORIZED_UPDATERS[0]);

    let blockTs = (await time.latest()) + 2;
    await time.setNextBlockTimestamp(blockTs);
    await expect(
      adapter
        .connect(updater)
        .updateDataFeedsValues(toMicros(blockTs), [{ dataFeedId: DATA_FEED_ID, price: 0 }])
    ).to.emit(adapter, "UpdateSkipDueToInvalidValue");

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

    await network.provider.send("evm_setAutomine", [false]);

    const fixedBlockTs = (await time.latest()) + 100;
    await time.setNextBlockTimestamp(fixedBlockTs);

    const price1 = utils.parseUnits("1", 8);
    const price2 = utils.parseUnits("2", 8);
    const ts1 = toMicros(fixedBlockTs) + 10;
    const ts2 = ts1 + 1;

    await adapter
      .connect(updater)
      .updateDataFeedsValues(ts1, [{ dataFeedId: DATA_FEED_ID, price: price1 }]);

    const tx2 = await adapter
      .connect(updater)
      .updateDataFeedsValues(ts2, [{ dataFeedId: DATA_FEED_ID, price: price2 }]);

    await network.provider.send("evm_mine", [fixedBlockTs]);
    await network.provider.send("evm_setAutomine", [true]);

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

  it("handles concurrent batch updates from multiple updaters; aggregation per feed is independent", async () => {
    const feeds = [
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("BTC"),
      utils.formatBytes32String("USDT"),
      utils.formatBytes32String("LINK"),
      utils.formatBytes32String("MATIC"),
    ];

    const base = (await time.latest()) + 2;
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
      const expected = 1020 + feeds.indexOf(feedId);
      expect(await adapter.getValueForDataFeed(feedId)).to.equal(
        utils.parseUnits(String(expected), 8)
      );
    }
  });

  it("returns zeros for never-updated feed via unsafe getter; strict getters revert", async () => {
    const unsafe = await adapter.getLastUpdateDetailsUnsafe(DATA_FEED_ID);
    expect(unsafe.lastValue).to.equal(0);
    expect(unsafe.lastDataTimestamp).to.equal(0);
    expect(unsafe.lastBlockTimestamp).to.equal(0);
    await expect(adapter.getValueForDataFeed(DATA_FEED_ID)).to.be.revertedWithCustomError(
      adapter,
      "InvalidLastUpdateDetails"
    );
    await expect(
      adapter.getDataTimestampFromLatestUpdate(DATA_FEED_ID)
    ).to.be.revertedWithCustomError(adapter, "InvalidLastUpdateDetails");
    await expect(
      adapter.getBlockTimestampFromLatestUpdate(DATA_FEED_ID)
    ).to.be.revertedWithCustomError(adapter, "InvalidLastUpdateDetails");
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

  describe("Median of prices (exposed via mock)", () => {
    it("returns median for odd count", async () => {
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
        0,
      ];
      const median = await adapter._medianOfPrices(p, 4);
      expect(median).to.equal(utils.parseUnits("250", 8));
    });

    it("odd count = 5 → median = 102 for every permutation", async () => {
      const values5 = [100, 101, 102, 103, 500];
      const expected = utils.parseUnits("102", 8);

      for (const perm of permutations(values5)) {
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
      const values = [100, 100, 300, 400];
      const expected = utils.parseUnits("200", 8);

      for (const perm of permutations(values)) {
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8),
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];
        const median = await adapter._medianOfPrices(padded, 4);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });

    it("odd count = 3 with duplicates → median = 20 for every permutation", async () => {
      const values = [20, 20, 30];
      const expected = utils.parseUnits("20", 8);

      for (const perm of permutations(values)) {
        const padded = [
          ...perm.map((x) => utils.parseUnits(String(x), 8)),
          utils.parseUnits("0", 8),
          utils.parseUnits("0", 8),
        ] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish];
        const median = await adapter._medianOfPrices(padded, 3);
        expect(median).to.equal(expected, `perm=${perm.join(",")}`);
      }
    });
  });
});
