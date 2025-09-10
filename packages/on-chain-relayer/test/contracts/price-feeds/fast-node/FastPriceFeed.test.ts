import { expect } from "chai";
import { ethers } from "hardhat";
import { FastMultiFeedAdapter, FastPriceFeedMock } from "../../../../typechain-types";
import { deployAdapter, updateByAllNodes } from "./FastMultiFeedAdapter.test";

const DATA_FEED_ID = ethers.utils.formatBytes32String("ETH");

async function deployFastPriceFeed(adapter: FastMultiFeedAdapter): Promise<FastPriceFeedMock> {
  const factory = await ethers.getContractFactory("FastPriceFeedMock");
  const feed = await factory.deploy(adapter.address, DATA_FEED_ID);
  await feed.deployed();
  return feed;
}

describe("FastPriceFeed", function () {
  let adapter: FastMultiFeedAdapter;
  let feed: FastPriceFeedMock;

  beforeEach(async () => {
    adapter = await deployAdapter();
    feed = await deployFastPriceFeed(adapter);
  });

  it("should return latestAnswer as int256 price", async () => {
    const prices = [1230, 1232, 1233, 1234, 1235];
    await updateByAllNodes(adapter, prices);
    const answer = await feed.latestAnswer();
    expect(answer).to.equal(ethers.utils.parseUnits("1235", 8));
  });

  it("should return correct round data", async () => {
    const prices = [5675, 5676, 5677, 5678, 5679];
    const { blockTimestamps } = await updateByAllNodes(adapter, prices);
    const roundId = await feed.latestRound();
    const data = await feed.getRoundData(roundId);

    expect(data[0]).to.equal(roundId); // roundId
    expect(data[1]).to.equal(ethers.utils.parseUnits("5679", 8)); // answer
    expect(data[2].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // blockTimestamp
    expect(data[3].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // blockTimestamp
    expect(data[4]).to.equal(roundId); // answeredInRound
  });

  it("should revert if getRoundData is called with invalid round", async () => {
    await expect(feed.getRoundData(1)).to.be.revertedWithCustomError(adapter, "RoundIdTooHigh");
  });

  it("should return latestRoundData correctly", async () => {
    const prices = [10002, 10001, 10000, 9999, 9998];
    const { blockTimestamps } = await updateByAllNodes(adapter, prices);
    const data = await feed.latestRoundData();
    expect(data[0]).to.equal(1); // roundId
    expect(data[1]).to.equal(ethers.utils.parseUnits("9998", 8));
    expect(data[2].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // blockTimestamp
    expect(data[3].toNumber()).to.equal(blockTimestamps[4] * 1_000_000); // blockTimestamp
    expect(data[0]).to.equal(1); // answeredInRound
  });

  it("should return correct decimals and version", async () => {
    expect(await feed.decimals()).to.equal(8);
    expect(await feed.version()).to.equal(1);
  });
});
