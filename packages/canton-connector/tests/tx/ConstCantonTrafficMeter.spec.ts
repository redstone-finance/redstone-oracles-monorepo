import { FP } from "@redstone-finance/utils";
import {
  ConstCantonTrafficMeter,
  DAILY_TRAFFIC_BUDGET_BYTES,
  MAX_ELAPSED_MS,
  ONE_DAY_MS,
} from "../../src/tx/ConstCantonTrafficMeter";
import { ResetableCantonTrafficMeter } from "./resetable-canton-traffic-meter";

const ALL_FEEDS = ["ETH", "BTC", "USDC", "DAI", "EUR"];
const TOTAL_FEED_COUNT = ALL_FEEDS.length;
const SENT_FEEDS = ALL_FEEDS.slice(0, 2);
const SENT_FEED_COUNT = SENT_FEEDS.length;
const START_MS = 1_700_000_000_000;
const OK_RESULT = FP.ok({ transactionHash: "0x", metadata: {} });

const SUB_CAP_GAP_MS = MAX_ELAPSED_MS / 2;
const SUB_CAP_LATE_MS = MAX_ELAPSED_MS / 4;
const OVER_CAP_GAP_MS = MAX_ELAPSED_MS * 1_000;

const expectedCost = (elapsedMsSum: number) =>
  Math.round((DAILY_TRAFFIC_BUDGET_BYTES * elapsedMsSum) / (ONE_DAY_MS * TOTAL_FEED_COUNT));

const makeMeter = (shouldAccumulate = true, feedCount = TOTAL_FEED_COUNT) =>
  new ConstCantonTrafficMeter(shouldAccumulate, feedCount);

describe("ConstCantonTrafficMeter", () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    ResetableCantonTrafficMeter.resetAccumulatingInstance();
    nowSpy = jest.spyOn(Date, "now");
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("accumulates nothing on the first send (no elapsed time yet)", () => {
    nowSpy.mockReturnValue(START_MS);
    const sut = makeMeter();

    sut.afterUpdate(ALL_FEEDS, OK_RESULT);

    expect(sut.consumeAccumulated()).toBeFalsy();
  });

  it("scales the cost by each feed's gap and the sent/total feed ratio", () => {
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + SUB_CAP_GAP_MS);
    const sut = makeMeter();

    sut.afterUpdate(ALL_FEEDS, OK_RESULT);
    sut.afterUpdate(SENT_FEEDS, OK_RESULT);

    expect(sut.consumeAccumulated()).toBe(expectedCost(SENT_FEED_COUNT * SUB_CAP_GAP_MS));
  });

  it("charges a split-out feed its own full gap, not just the time since the partial send", () => {
    nowSpy
      .mockReturnValueOnce(START_MS)
      .mockReturnValueOnce(START_MS + SUB_CAP_GAP_MS)
      .mockReturnValueOnce(START_MS + SUB_CAP_GAP_MS + SUB_CAP_LATE_MS);
    const sut = makeMeter();
    const [delayedFeed, ...onTimeFeeds] = ALL_FEEDS;

    sut.afterUpdate(ALL_FEEDS, OK_RESULT);
    sut.afterUpdate(onTimeFeeds, OK_RESULT);
    sut.afterUpdate([delayedFeed], OK_RESULT);

    const elapsedMsSum =
      (TOTAL_FEED_COUNT - 1) * SUB_CAP_GAP_MS + (SUB_CAP_GAP_MS + SUB_CAP_LATE_MS);
    expect(sut.consumeAccumulated()).toBe(expectedCost(elapsedMsSum));
  });

  it("clamps each feed's gap to MAX_ELAPSED_MS", () => {
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + OVER_CAP_GAP_MS);
    const sut = makeMeter();

    sut.afterUpdate(ALL_FEEDS, OK_RESULT);
    sut.afterUpdate(ALL_FEEDS, OK_RESULT);

    expect(sut.consumeAccumulated()).toBe(expectedCost(TOTAL_FEED_COUNT * MAX_ELAPSED_MS));
  });

  it("rounds the accumulated cost to whole bytes", () => {
    const ELAPSED_MS = 9;
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + ELAPSED_MS);
    const sut = makeMeter();

    sut.afterUpdate(ALL_FEEDS, OK_RESULT);
    sut.afterUpdate(ALL_FEEDS, OK_RESULT);

    const rawCost = (DAILY_TRAFFIC_BUDGET_BYTES * ELAPSED_MS) / ONE_DAY_MS;
    expect(rawCost).not.toBe(Math.round(rawCost));
    expect(sut.consumeAccumulated()).toBe(Math.round(rawCost));
  });

  it("logs the tx metadata so paidTrafficCost is readable under the const meter", () => {
    nowSpy.mockReturnValue(START_MS);
    const sut = makeMeter();
    const logSpy = jest.spyOn(ResetableCantonTrafficMeter.logger, "info");

    sut.afterUpdate(
      ALL_FEEDS,
      FP.ok({ transactionHash: "0x", metadata: { paidTrafficCost: 7_186 } })
    );

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Traffic used"), {
      metadata: { paidTrafficCost: 7_186 },
    });
    logSpy.mockRestore();
  });

  it("does not refund — time-based cost is re-billed by the next slice", () => {
    const sut = makeMeter();

    sut.refund();

    expect(sut.consumeAccumulated()).toBeFalsy();
  });
});
