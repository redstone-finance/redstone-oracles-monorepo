import { expect } from "chai";
import { ethers } from "hardhat";
import { FastMultiFeedAdapterMock, FastPriceFeedMock } from "../../../../typechain-types";
import { deployAdapter, updateByAllNodesFresh } from "./fast-node-test-helpers";

const DATA_FEED_ID = ethers.utils.formatBytes32String("ETH");

async function deployFastPriceFeed(adapter: FastMultiFeedAdapterMock): Promise<FastPriceFeedMock> {
  const factory = await ethers.getContractFactory("FastPriceFeedMock");
  const feed = await factory.deploy(adapter.address, DATA_FEED_ID);
  await feed.deployed();
  return feed;
}

describe("FastPriceFeed", function () {
  let adapter: FastMultiFeedAdapterMock;
  let feed: FastPriceFeedMock;

  beforeEach(async () => {
    adapter = await deployAdapter();
    feed = await deployFastPriceFeed(adapter);
  });

  it("returns latestAnswer as int256 (median of fresh prices after the first batch)", async () => {
    // With 5 fresh updates [1230, 1232, 1233, 1234, 1235], rounds are created on the 3rd/4th/5th update.
    // The final latestAnswer should be the median of all 5 fresh prices = 1233.
    await updateByAllNodesFresh(adapter, [1230, 1232, 1233, 1234, 1235]);
    const answer = await feed.latestAnswer();
    expect(answer).to.equal(ethers.utils.parseUnits("1233", 8));
  });

  it("returns correct round data (created on the 3rd fresh update)", async () => {
    // Batch of 5 fresh updates creates 3 rounds: at 3rd, 4th and 5th tx.
    const { blockTimestamps } = await updateByAllNodesFresh(
      adapter,
      [5675, 5676, 5677, 5678, 5679]
    );

    const latest = await feed.latestRound();
    expect(latest).to.equal(3, "first batch creates 3 rounds");

    // Round #1 is the one created on the 3rd update (index 2).
    const roundId = 1;
    const data = await feed.getRoundData(roundId);

    // (roundId, answer, startedAt, updatedAt, answeredInRound)
    expect(data[0]).to.equal(roundId);
    expect(data[1]).to.equal(ethers.utils.parseUnits("5676", 8)); // median of [5675,5676,5677]
    expect(data[2].toNumber()).to.equal(blockTimestamps[2] * 1_000_000); // 3rd tx block ts in µs
    expect(data[3].toNumber()).to.equal(blockTimestamps[2] * 1_000_000);
    expect(data[4]).to.equal(roundId);
  });

  it("reverts getRoundData for an invalid round", async () => {
    await expect(feed.getRoundData(1)).to.be.revertedWithCustomError(adapter, "RoundIdTooHigh");
  });

  it("returns latestRoundData consistent with getRoundData", async () => {
    // First five values lead to 3 rounds; with plain median the latest answer after 5 updates is 10000.
    const { blockTimestamps } = await updateByAllNodesFresh(
      adapter,
      [10002, 10001, 10000, 9999, 9998]
    );

    const latest = await feed.latestRound();
    expect(latest).to.equal(3, "first batch creates 3 rounds");

    const data = await feed.latestRoundData();

    // latestRoundData refers to round #3 created on the 5th update (index 4)
    expect(data[0]).to.equal(3); // roundId
    expect(data[1]).to.equal(ethers.utils.parseUnits("10000", 8)); // median of [9998,9999,10000,10001,10002]
    expect(data[2].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // startedAt
    expect(data[3].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // updatedAt
    expect(data[4]).to.equal(3); // answeredInRound
  });

  it("returns correct decimals and version", async () => {
    expect(await feed.decimals()).to.equal(8);
    expect(await feed.version()).to.equal(1);
  });
});
