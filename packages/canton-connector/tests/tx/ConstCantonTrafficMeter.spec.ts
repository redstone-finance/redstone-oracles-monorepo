import { FP, RedstoneCommon } from "@redstone-finance/utils";
import {
  ConstCantonTrafficMeter,
  DAILY_TRAFFIC_BUDGET_BYTES,
  ONE_DAY_MS,
} from "../../src/tx/ConstCantonTrafficMeter";
import { ResetableCantonTrafficMeter } from "./resetable-canton-traffic-meter";

const ONE_HOUR_MS = RedstoneCommon.hourToMs(1);
const TOTAL_FEED_COUNT = 5;
const SENT_FEED_COUNT = 2;
const START_MS = 1_700_000_000_000;
const OK_RESULT = FP.ok({ transactionHash: "0x", metadata: {} });

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

    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);

    expect(sut.consumeAccumulated()).toBeFalsy();
  });

  it("charges the full daily budget when all feeds are sent after a full day", () => {
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + ONE_DAY_MS);
    const sut = new ConstCantonTrafficMeter(true, TOTAL_FEED_COUNT);

    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);
    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);

    expect(sut.consumeAccumulated()).toBe(DAILY_TRAFFIC_BUDGET_BYTES);
  });

  it("scales the cost by elapsed time and the sent/total feed ratio", () => {
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + ONE_HOUR_MS);
    const sut = makeMeter();

    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);
    sut.afterUpdate(SENT_FEED_COUNT, OK_RESULT);

    expect(sut.consumeAccumulated()).toBe(
      (DAILY_TRAFFIC_BUDGET_BYTES * ONE_HOUR_MS * SENT_FEED_COUNT) / (ONE_DAY_MS * TOTAL_FEED_COUNT)
    );
  });

  it("rounds the accumulated cost to whole bytes", () => {
    const ELAPSED_MS = 9;
    nowSpy.mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + ELAPSED_MS);
    const sut = makeMeter();

    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);
    sut.afterUpdate(TOTAL_FEED_COUNT, OK_RESULT);

    const rawCost = (DAILY_TRAFFIC_BUDGET_BYTES * ELAPSED_MS) / ONE_DAY_MS;
    expect(rawCost).not.toBe(Math.round(rawCost));
    expect(sut.consumeAccumulated()).toBe(Math.round(rawCost));
  });

  it("logs the tx metadata so paidTrafficCost is readable under the const meter", () => {
    nowSpy.mockReturnValue(START_MS);
    const sut = makeMeter();
    const logSpy = jest.spyOn(ResetableCantonTrafficMeter.logger, "info");

    sut.afterUpdate(
      TOTAL_FEED_COUNT,
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
