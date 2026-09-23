import { Events } from "@redstone-finance/multichain-kit";
import { buildNormalizedSuiTx } from "../src/client/lookup/SuiTxParsing";

const BLOCK_NUMBER = 278915300;
const BLOCK_TIMESTAMP = 1758528000;
const GAS_USED = 1000;
const WRITES = [
  { feedId: "BTC", payload: "0xaa" },
  { feedId: "ETH", payload: "0xbb" },
];
const BTC_VALUE = 85720.2239239;
const EVENTS: Events = {
  BTC: { name: "ValueUpdate", feedId: "BTC", updated: true, value: BTC_VALUE },
  ETH: { name: "UpdateSkipDueToDataTimestamp", feedId: "ETH", updated: false },
};
const ALL_SKIPPED_EVENTS: Events = {
  BTC: { name: "UpdateSkipDueToDataTimestamp", feedId: "BTC", updated: false },
  ETH: { name: "UpdateSkipDueToDataTimestamp", feedId: "ETH", updated: false },
};

describe("buildNormalizedSuiTx", () => {
  it("should not mark a transaction as failed when a single feed was skipped", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(false));

    expect(btc.isFailed).toEqual(false);
    expect(eth.isFailed).toEqual(false);
  });

  it("should mark every feed as failed when every feed was skipped", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(false, ALL_SKIPPED_EVENTS));

    expect(btc.isFailed).toEqual(true);
    expect(eth.isFailed).toEqual(true);
  });

  it("should not mark a transaction without events as failed", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(false, {}));

    expect(btc.isFailed).toEqual(false);
    expect(eth.isFailed).toEqual(false);
  });

  it("should mark every feed as failed when the transaction effects failed", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(true));

    expect(btc.isFailed).toEqual(true);
    expect(eth.isFailed).toEqual(true);
  });

  it("should give each feed only its own event", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(false));

    expect(btc.events).toEqual({
      BTC: { name: "ValueUpdate", feedId: "BTC", updated: true, value: BTC_VALUE },
    });
    expect(eth.events).toEqual({
      ETH: { name: "UpdateSkipDueToDataTimestamp", feedId: "ETH", updated: false },
    });
  });

  it("should split the gas cost between the feeds of one transaction", () => {
    const [btc, eth] = buildNormalizedSuiTx(makeParams(false));

    expect(btc.gasUsed).toEqual(GAS_USED / WRITES.length);
    expect(eth.gasUsed).toEqual(GAS_USED / WRITES.length);
  });
});

function makeParams(effectFailed: boolean, events = EVENTS) {
  return {
    blockNumber: BLOCK_NUMBER,
    blockTimestamp: BLOCK_TIMESTAMP,
    hash: "digest",
    sender: "0xsender",
    targetObjectId: "0xadapter",
    writes: WRITES,
    gasLimit: "120000000",
    gasPrice: "1000",
    effectFailed,
    gasUsed: GAS_USED,
    events,
  };
}
