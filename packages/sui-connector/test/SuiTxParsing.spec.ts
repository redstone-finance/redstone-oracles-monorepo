import { Events, MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE } from "@redstone-finance/multichain-kit";
import { buildNormalizedSuiTx } from "../src/client/lookup/SuiTxParsing";
import { ADAPTER_OBJECT_ID, DIGEST, GAS_BUDGET, GAS_PRICE, SENDER } from "./fixtures";

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
  it("should build one record carrying the payload of every write", () => {
    expect(buildNormalizedSuiTx(makeParams(false))).toEqual([
      {
        blockNumber: BLOCK_NUMBER,
        blockTimestamp: BLOCK_TIMESTAMP,
        hash: DIGEST,
        from: SENDER,
        to: ADAPTER_OBJECT_ID,
        data: WRITES.map(({ payload }) => payload),
        gasLimit: GAS_BUDGET,
        gasPrice: GAS_PRICE,
        isFailed: false,
        gasUsed: GAS_USED,
        events: EVENTS,
        functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
      },
    ]);
  });

  it("should not mark a transaction as failed when a single feed was skipped", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(false));

    expect(tx.isFailed).toEqual(false);
  });

  it("should mark the transaction as failed when every feed was skipped", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(false, ALL_SKIPPED_EVENTS));

    expect(tx.isFailed).toEqual(true);
  });

  it("should not mark a transaction without events as failed", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(false, {}));

    expect(tx.isFailed).toEqual(false);
  });

  it("should mark the transaction as failed when the transaction effects failed", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(true));

    expect(tx.isFailed).toEqual(true);
  });

  it("should carry the events of every written feed", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(false));

    expect(tx.events).toEqual(EVENTS);
  });

  it("should keep the gas cost of the whole transaction", () => {
    const [tx] = buildNormalizedSuiTx(makeParams(false));

    expect(tx.gasUsed).toEqual(GAS_USED);
  });
});

function makeParams(effectFailed: boolean, events = EVENTS) {
  return {
    blockNumber: BLOCK_NUMBER,
    blockTimestamp: BLOCK_TIMESTAMP,
    hash: DIGEST,
    sender: SENDER,
    targetObjectId: ADAPTER_OBJECT_ID,
    writes: WRITES,
    gasLimit: GAS_BUDGET,
    gasPrice: GAS_PRICE,
    effectFailed,
    gasUsed: GAS_USED,
    events,
  };
}
