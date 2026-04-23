import { CantonTrafficMeter } from "../src";

const BASE = 1_000_000_000;

const resetAccumulatingSingleton = () => {
  (
    CantonTrafficMeter as unknown as { accumulatingInstance?: CantonTrafficMeter }
  ).accumulatingInstance = undefined;
};

describe("CantonTrafficMeter", () => {
  beforeEach(resetAccumulatingSingleton);

  describe("register with initial and totalConsumed", () => {
    it("accumulates the delta on the first registration", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 5_000);

      expect(sut.consumeAccumulated()).toBe(5_000);
    });

    it("deduplicates when initial < lastRegisteredConsumed", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 5_000); // +5_000, lastRegistered = BASE + 5_000
      sut.register(BASE + 2_000, BASE + 10_000); // initial < last → base = BASE + 5_000, +5_000

      expect(sut.consumeAccumulated()).toBe(10_000);
    });

    it("uses initial as base when initial >= lastRegisteredConsumed", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 5_000); // +5_000
      sut.register(BASE + 6_000, BASE + 9_000); // base = initial, +3_000

      expect(sut.consumeAccumulated()).toBe(8_000);
    });

    it("handles initial == lastRegisteredConsumed without double counting", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 5_000); // +5_000
      sut.register(BASE + 5_000, BASE + 12_000); // base = last = initial, +7_000

      expect(sut.consumeAccumulated()).toBe(12_000);
    });

    it("ignores negative delta", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE + 5_000, BASE);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("advances lastRegisteredConsumed across multiple registrations", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 4_000); // lastRegistered = BASE + 4_000, +4_000
      sut.register(BASE + 1_000, BASE + 9_000); // stale initial → base = BASE + 4_000, +5_000
      sut.register(BASE + 5_000, BASE + 15_000); // stale initial → base = BASE + 9_000, +6_000

      expect(sut.consumeAccumulated()).toBe(15_000);
    });
  });

  describe("register with missing initial or totalConsumed", () => {
    it("falls back to metadata.paidTrafficCost when initial is undefined", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, BASE + 5_000, { paidTrafficCost: 3_000 });

      expect(sut.consumeAccumulated()).toBe(3_000);
    });

    it("falls back to metadata.paidTrafficCost when totalConsumed is undefined", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, undefined, { paidTrafficCost: 4_200 });

      expect(sut.consumeAccumulated()).toBe(4_200);
    });

    it("does not accumulate when both are undefined and no metadata", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, undefined);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("does not accumulate when metadata.paidTrafficCost is undefined", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, undefined, {});

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("does not accumulate when metadata.paidTrafficCost is negative", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, undefined, { paidTrafficCost: -1_000 });

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("leaves lastRegisteredConsumed untouched when falling back", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, undefined, { paidTrafficCost: 10_000 }); // +10_000, no dedup state
      sut.register(BASE, BASE + 6_000); // base = BASE, +6_000

      expect(sut.consumeAccumulated()).toBe(16_000);
    });

    it("accumulates multiple metadata.paidTrafficCost values", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(undefined, undefined, { paidTrafficCost: 1_000 });
      sut.register(undefined, undefined, { paidTrafficCost: 2_000 });
      sut.register(undefined, undefined, { paidTrafficCost: 3_000 });

      expect(sut.consumeAccumulated()).toBe(6_000);
    });
  });

  describe("shouldAccumulateTraffic=false", () => {
    it("does not accumulate deltas", () => {
      const sut = new CantonTrafficMeter(false);

      sut.register(BASE, BASE + 5_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("does not accumulate metadata fallbacks", () => {
      const sut = new CantonTrafficMeter(false);

      sut.register(undefined, undefined, { paidTrafficCost: 3_000 });

      expect(sut.consumeAccumulated()).toBeFalsy();
    });

    it("still advances lastRegisteredConsumed so deduplication remains correct", () => {
      const sut = new CantonTrafficMeter(false);

      sut.register(BASE, BASE + 5_000);
      sut.register(BASE + 1_000, BASE + 10_000);

      expect(sut.consumeAccumulated()).toBeFalsy();
    });
  });

  describe("consumeAccumulated", () => {
    it("resets the accumulator after consumption", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 7_500);

      expect(sut.consumeAccumulated()).toBe(7_500);
      expect(sut.consumeAccumulated()).toBe(0);
    });

    it("returns undefined when nothing has been accumulated", () => {
      const sut = new CantonTrafficMeter(true);

      expect(sut.consumeAccumulated()).toBeUndefined();
    });

    it("sums deltas and metadata fallbacks across calls", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 4_000); // +4_000
      sut.register(undefined, undefined, { paidTrafficCost: 2_500 }); // +2_500
      sut.register(BASE + 6_000, BASE + 9_000); // +3_000

      expect(sut.consumeAccumulated()).toBe(9_500);
    });

    it("allows accumulating again after consumption", () => {
      const sut = new CantonTrafficMeter(true);

      sut.register(BASE, BASE + 5_000);
      sut.consumeAccumulated();
      sut.register(BASE + 6_000, BASE + 10_000);

      expect(sut.consumeAccumulated()).toBe(4_000);
    });
  });

  describe("singleton guard", () => {
    it("prevents creating more than one accumulating instance", () => {
      new CantonTrafficMeter(true);

      expect(() => new CantonTrafficMeter(true)).toThrow(
        /Creating a new accumulating instance of CantonTrafficMeter/
      );
    });

    it("allows creating multiple non-accumulating instances", () => {
      expect(() => {
        new CantonTrafficMeter(false);
        new CantonTrafficMeter(false);
        new CantonTrafficMeter(false);
      }).not.toThrow();
    });

    it("allows a non-accumulating instance alongside an accumulating one", () => {
      new CantonTrafficMeter(true);

      expect(() => new CantonTrafficMeter(false)).not.toThrow();
    });

    it("allows an accumulating instance after only non-accumulating ones were created", () => {
      new CantonTrafficMeter(false);
      new CantonTrafficMeter(false);

      expect(() => new CantonTrafficMeter(true)).not.toThrow();
    });
  });
});
