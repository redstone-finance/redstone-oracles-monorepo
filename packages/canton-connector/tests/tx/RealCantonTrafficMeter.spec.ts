import { FP } from "@redstone-finance/utils";
import { RealCantonTrafficMeter } from "../../src/tx/RealCantonTrafficMeter";
import { TX_HASH } from "../test-helpers";
import { ResetableCantonTrafficMeter } from "./resetable-canton-traffic-meter";

const BASE = 1_000_000_000;

const makeMeter = (shouldAccumulate = true, fetch = () => Promise.resolve(0)) =>
  new RealCantonTrafficMeter(shouldAccumulate, fetch);

describe("RealCantonTrafficMeter", () => {
  beforeEach(ResetableCantonTrafficMeter.resetAccumulatingInstance);

  describe("registerMeasured", () => {
    it("accumulates the delta on the first measurement", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 5_000);

      expect(sut.consumeAccumulated()).toBe(5_000);
    });

    it("deduplicates when initial < lastRegisteredConsumed", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 5_000); // +5_000, last = BASE + 5_000
      sut.registerMeasured(BASE + 2_000, BASE + 10_000); // initial < last → base = BASE + 5_000, +5_000

      expect(sut.consumeAccumulated()).toBe(10_000);
    });

    it("uses initial as base when initial >= lastRegisteredConsumed", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 5_000); // +5_000
      sut.registerMeasured(BASE + 6_000, BASE + 9_000); // base = initial, +3_000

      expect(sut.consumeAccumulated()).toBe(8_000);
    });

    it("ignores a negative delta", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE + 5_000, BASE);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("advances lastRegisteredConsumed across multiple measurements", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 4_000); // last = BASE + 4_000, +4_000
      sut.registerMeasured(BASE + 1_000, BASE + 9_000); // stale initial → base = BASE + 4_000, +5_000
      sut.registerMeasured(BASE + 5_000, BASE + 15_000); // stale initial → base = BASE + 9_000, +6_000

      expect(sut.consumeAccumulated()).toBe(15_000);
    });
  });

  describe("refund", () => {
    it("credits a positive cost back", () => {
      const sut = makeMeter();

      sut.refund(3_000);

      expect(sut.consumeAccumulated()).toBe(3_000);
    });

    it("ignores a negative cost", () => {
      const sut = makeMeter();

      sut.refund(-1_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("sums multiple refunds", () => {
      const sut = makeMeter();

      sut.refund(1_000);
      sut.refund(2_000);

      expect(sut.consumeAccumulated()).toBe(3_000);
    });
  });

  describe("before/after cycle", () => {
    it("registers the measured delta between the before and after snapshots", async () => {
      const sut = makeMeter(
        true,
        jest
          .fn()
          .mockResolvedValueOnce(BASE)
          .mockResolvedValueOnce(BASE + 4_000)
      );

      sut.beforeUpdate();
      await sut.afterUpdate(
        ["ETH", "BTC", "CC"],
        FP.ok({ transactionHash: TX_HASH.eth, metadata: {} })
      );

      expect(sut.consumeAccumulated()).toBe(4_000);
    });

    it("waits for the before snapshot even when it resolves after the update", async () => {
      let resolveInitial!: (value: number) => void;
      const initialSnapshot = new Promise<number>((resolve) => (resolveInitial = resolve));
      const sut = makeMeter(
        true,
        jest
          .fn()
          .mockReturnValueOnce(initialSnapshot)
          .mockResolvedValueOnce(BASE + 4_000)
      );

      sut.beforeUpdate();
      const measured = sut.afterUpdate(
        ["ETH", "BTC", "CC"],
        FP.ok({ transactionHash: TX_HASH.eth, metadata: {} })
      );
      resolveInitial(BASE);
      await measured;

      // resolved only after the late before-snapshot → delta registered, not the metadata fallback
      expect(sut.consumeAccumulated()).toBe(4_000);
    });

    it("falls back to metadata paidTrafficCost when a snapshot is unavailable", async () => {
      const sut = makeMeter(true, jest.fn().mockResolvedValue(undefined));

      sut.beforeUpdate();
      await sut.afterUpdate(
        ["BTC"],
        FP.ok({ transactionHash: TX_HASH.btc, metadata: { paidTrafficCost: 2_000 } })
      );

      expect(sut.consumeAccumulated()).toBe(2_000);
    });

    it("keeps metadata under a 'Traffic used' message on the incomplete fallback", async () => {
      const sut = makeMeter(true, jest.fn().mockResolvedValue(undefined));
      const warnSpy = jest.spyOn(ResetableCantonTrafficMeter.logger, "warn");

      sut.beforeUpdate();
      await sut.afterUpdate(
        ["BTC"],
        FP.ok({ transactionHash: TX_HASH.btc, metadata: { paidTrafficCost: 2_000 } })
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Traffic used"),
        expect.objectContaining({ metadata: { paidTrafficCost: 2_000 } })
      );
      warnSpy.mockRestore();
    });
  });

  describe("shouldAccumulateTraffic=false", () => {
    it("does not accumulate measured deltas", () => {
      const sut = makeMeter(false);

      sut.registerMeasured(BASE, BASE + 5_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("does not accumulate refunds", () => {
      const sut = makeMeter(false);

      sut.refund(3_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("still advances lastRegisteredConsumed so deduplication stays correct", () => {
      const sut = makeMeter(false);

      sut.registerMeasured(BASE, BASE + 5_000);
      sut.registerMeasured(BASE + 1_000, BASE + 10_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });
  });

  describe("consumeAccumulated", () => {
    it("resets the accumulator after consumption", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 7_500);

      expect(sut.consumeAccumulated()).toBe(7_500);
      expect(sut.consumeAccumulated()).toBe(0);
    });

    it("returns 0 when nothing has been accumulated", () => {
      const sut = makeMeter();

      expect(sut.consumeAccumulated()).toBe(0);
    });

    it("sums measured deltas and refunds across calls", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 4_000); // +4_000
      sut.refund(2_500); // +2_500
      sut.registerMeasured(BASE + 6_000, BASE + 9_000); // +3_000

      expect(sut.consumeAccumulated()).toBe(9_500);
    });

    it("allows accumulating again after consumption", () => {
      const sut = makeMeter();

      sut.registerMeasured(BASE, BASE + 5_000);
      sut.consumeAccumulated();
      sut.registerMeasured(BASE + 6_000, BASE + 10_000);

      expect(sut.consumeAccumulated()).toBe(4_000);
    });
  });

  describe("singleton guard", () => {
    it("prevents creating more than one accumulating instance", () => {
      makeMeter();

      expect(() => makeMeter()).toThrow(
        /Creating a new accumulating instance of CantonTrafficMeter/
      );
    });

    it("allows creating multiple non-accumulating instances", () => {
      expect(() => {
        makeMeter(false);
        makeMeter(false);
        makeMeter(false);
      }).not.toThrow();
    });

    it("allows a non-accumulating instance alongside an accumulating one", () => {
      makeMeter();

      expect(() => makeMeter(false)).not.toThrow();
    });

    it("allows an accumulating instance after only non-accumulating ones were created", () => {
      makeMeter(false);
      makeMeter(false);

      expect(() => makeMeter()).not.toThrow();
    });
  });
});
