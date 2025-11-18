import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { utils } from "ethers";
import { ethers } from "hardhat";
import { FastMultiFeedAdapter } from "../../../../typechain-types";
import { getImpersonatedSigner } from "../../../helpers";

export const DATA_FEED_ID = utils.formatBytes32String("ETH");

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

/** Deploys the mock (history size = 10) */
export async function deployAdapter() {
  const factory = await ethers.getContractFactory("FastMultiFeedAdapterMock");
  const adapter = await factory.deploy();
  await adapter.deployed();
  return adapter;
}

/** Converts seconds to microseconds used by the contract */
export function toMicros(blockTs: number) {
  return blockTs * 1_000_000;
}
