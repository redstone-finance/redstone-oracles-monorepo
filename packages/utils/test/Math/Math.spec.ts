import { max, sum } from "lodash";
import {
  calculateAverageValue,
  calculateDeviationPercent,
  calculateSum,
  createSafeNumber,
  getMedian,
  getWeightedMedian,
  limitWeights,
  NumberArg,
} from "../../src/ISafeNumber";
import { Clamper, filterOutliers } from "../../src/math";
import { monotoneCubicInterpolation } from "../../src/math/monotonic-cubic-spline";

describe("calculateSum", () => {
  it("Should properly calculate sum for empty array", () => {
    expect(calculateSum([]).toString()).toBe("0");
  });

  it("Should properly calculate sum for 1-elem array", () => {
    expect(calculateSum([createSafeNumber(42)]).toString()).toBe("42");
  });

  it("Should properly calculate sum for 3-elem array", () => {
    expect(calculateSum([42, 100, 1000].map(createSafeNumber)).toString()).toBe("1142");
  });

  it("Should properly calculate sum for a big array", () => {
    const bigArr = Array<NumberArg>(2000).fill(120000);
    expect(calculateSum(bigArr).toString()).toBe((120000 * 2000).toString());
  });
});

describe("calculateAverageValue", () => {
  it("Should properly calculate an average value for 1-elem arrays", () => {
    expect(calculateAverageValue([createSafeNumber(42)]).toString()).toBe("42");
    expect(calculateAverageValue([createSafeNumber(142)]).toString()).toBe("142");
    expect(calculateAverageValue([createSafeNumber(120)]).toString()).toBe("120");
  });

  it("Should properly calculate an average value for a 3-elem array", () => {
    expect(calculateAverageValue([42, 44, 43].map(createSafeNumber)).toString()).toBe("43");
  });

  it("Should properly calculate an average value for a big array", () => {
    const bigArr = Array<NumberArg>(2000).fill(createSafeNumber(1121315));
    expect(calculateAverageValue(bigArr).toString()).toBe("1121315");
  });

  it("Should throw for an empty array", () => {
    expect(() => calculateAverageValue([])).toThrow(
      "Can not calculate an average value for an empty array"
    );
  });
});

describe("calculateDeviationPercent", () => {
  it("Should properly calculate zero deviation", () => {
    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(10.5),
        deviatedValue: createSafeNumber(10.5),
      }).toString()
    ).toBe("0");
  });

  it("Should properly calculate big deviations", () => {
    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(1),
        deviatedValue: createSafeNumber(10),
      }).toString()
    ).toBe("900");

    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(10),
        deviatedValue: createSafeNumber(1),
      }).toString()
    ).toBe("90");
  });

  it("Should properly calculate deviation with a negative value", () => {
    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(-42),
        deviatedValue: createSafeNumber(42),
      }).toString()
    ).toBe("200");
  });

  it("Should work with zero value", () => {
    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(0),
        deviatedValue: createSafeNumber(1),
      }).unsafeToNumber()
    ).toBeGreaterThan(2 ** 40); // some big number depends on implementation of N
  });

  it("Should properly calculate deviation for zero measured value and non-zero true value", () => {
    expect(
      calculateDeviationPercent({
        baseValue: createSafeNumber(1),
        deviatedValue: createSafeNumber(0),
      }).toString()
    ).toBe("100");
  });
});

describe("getMedian", () => {
  it("should throw for empty array", () => {
    expect(() => getMedian([])).toThrow();
  });

  it("should properly calculate median for odd number of elements", () => {
    expect(getMedian([3, 7, 2, 6, 5, 4, 9].map(createSafeNumber)).toString()).toEqual("5");
    expect(getMedian([-3, 0, 3].map(createSafeNumber)).toString()).toEqual("0");
    expect(getMedian([3, 0, -3].map(createSafeNumber)).toString()).toEqual("0");
    expect(getMedian([-7, -5, -11, -4, -8].map(createSafeNumber)).toString()).toEqual("-7");
  });

  it("should properly calculate median for even number of elements", () => {
    expect(getMedian([3, 7, 2, 6, 5, 4].map(createSafeNumber)).toString()).toEqual("4.5");
    expect(getMedian([-3, 0].map(createSafeNumber)).toString()).toEqual("-1.5");
    expect(getMedian([0, -3].map(createSafeNumber)).toString()).toEqual("-1.5");
    expect(getMedian([-7, -5, -4, -8].map(createSafeNumber)).toString()).toEqual("-6");
  });
});

describe("getWeightedMedian", () => {
  it("should throw for empty array", () => {
    expect(() => getWeightedMedian([])).toThrow();
  });

  it("should properly calculate weighted median", () => {
    expect(
      getWeightedMedian([
        { value: createSafeNumber(5), weight: createSafeNumber(0.25) },
        { value: createSafeNumber(4), weight: createSafeNumber(0.3) },
        { value: createSafeNumber(3), weight: createSafeNumber(0.2) },
        { value: createSafeNumber(2), weight: createSafeNumber(0.1) },
        { value: createSafeNumber(1), weight: createSafeNumber(0.15) },
      ]).toString()
    ).toEqual("4");
    expect(
      getWeightedMedian([
        { value: createSafeNumber(1), weight: createSafeNumber(0.25) },
        { value: createSafeNumber(2), weight: createSafeNumber(0.25) },
        { value: createSafeNumber(3), weight: createSafeNumber(0.25) },
        { value: createSafeNumber(4), weight: createSafeNumber(0.25) },
      ]).toString()
    ).toEqual("2.5");
  });
});

describe("limitWeights", () => {
  it("returns input unchanged when count <= 2 (no limit applies)", () => {
    const a = [{ value: createSafeNumber(1), weight: createSafeNumber(10) }];
    const b = [
      { value: createSafeNumber(1), weight: createSafeNumber(10) },
      { value: createSafeNumber(2), weight: createSafeNumber(5) },
    ];

    expect(limitWeights(a)).toEqual(a);
    expect(limitWeights(b)).toEqual(b);
  });

  it("caps a single heavy outlier for count = 3 (limit ratio = 0.4)", () => {
    // Weights: [10, 5, 5]
    // maxWeight solves: maxWeight = 0.4 * (maxWeight + 5 + 5)  =>  maxWeight = 6.(6)
    const input = [
      { value: createSafeNumber(1), weight: createSafeNumber(10) },
      { value: createSafeNumber(2), weight: createSafeNumber(5) },
      { value: createSafeNumber(3), weight: createSafeNumber(5) },
    ];

    const out = limitWeights(input);
    const nums = out.map((w) => w.weight.unsafeToNumber());

    // The big one should be reduced close to 6.(6), the others untouched
    expect(nums[0]).toBeCloseTo(20 / 3, 6); // 6.6666667
    expect(nums[1]).toBeCloseTo(5, 12);
    expect(nums[2]).toBeCloseTo(5, 12);

    // Invariant: maxWeight == ratio * cappedSum
    const cappedSum = sum(nums);
    const ratio = 0.4;
    const maxWeight = max(nums)!;
    expect(maxWeight).toBeCloseTo(ratio * cappedSum, 6);

    // Invariant: all weights <= maxWeight
    nums.forEach((w) => expect(w).toBeLessThanOrEqual(maxWeight + 1e-12));
  });

  it("does not cap when all weights already satisfy the ratio constraint", () => {
    // count = 5 => ratio = 0.35
    // All weights equal => max (10) <= 0.35 * total (50) = 17.5, so no capping
    const input = Array.from({ length: 5 }, (_, i) => ({
      value: createSafeNumber(i + 1),
      weight: createSafeNumber(10),
    }));

    const out = limitWeights(input);
    expect(out).toEqual(input);
  });

  it("caps exactly one large element in a bigger array (count = 10, ratio = 0.25)", () => {
    // Weights: [100, 10, 10, ..., 10] (1x100 + 9x10)
    // Solve maxWeight = 0.25 * (maxWeight + 90) => maxWeight = 30
    const input = [
      { value: createSafeNumber(1), weight: createSafeNumber(100) },
      ...Array.from({ length: 9 }, (_, i) => ({
        value: createSafeNumber(i + 2),
        weight: createSafeNumber(10),
      })),
    ];

    const out = limitWeights(input);
    const nums = out.map((w) => w.weight.unsafeToNumber());

    expect(nums[0]).toBeCloseTo(30, 12);
    nums.slice(1).forEach((w) => expect(w).toBeCloseTo(10, 12));

    const cappedSum = sum(nums);
    const ratio = 0.25;
    const maxWeight = max(nums)!;

    // Ratio invariant and dominance
    expect(maxWeight).toBeCloseTo(ratio * cappedSum, 12);
    nums.forEach((w) => expect(w).toBeLessThanOrEqual(maxWeight + 1e-12));

    // Order of elements (mapping preserves original order)
    // i.e. first element is the one that got capped
    expect(out[0].value.toString()).toBe("1");
  });

  it("preserves original value objects and only adjusts weights", () => {
    const input = [
      { value: createSafeNumber(42), weight: createSafeNumber(100) },
      { value: createSafeNumber(7), weight: createSafeNumber(1) },
      { value: createSafeNumber(8), weight: createSafeNumber(1) },
    ];

    const out = limitWeights(input);

    // Values untouched
    expect(out.map((v) => v.value.toString())).toEqual(input.map((v) => v.value.toString()));

    // At least one weight changed (the big one)
    expect(out[0].weight.toString()).not.toEqual(input[0].weight.toString());
  });
});

describe("filterOutliers function", () => {
  it("should return the single number as the representative group when only one number is provided", () => {
    const result = filterOutliers([5], 100);
    expect(result.representativeGroup).toEqual([5]);
    expect(result.outliers).toEqual([]);
  });

  it("should return both numbers as the representative group when two numbers are within maxDiscrepancy", () => {
    const result = filterOutliers([5, 95], 100);
    expect(result.representativeGroup).toEqual([5, 95]);
    expect(result.outliers).toEqual([]);
  });

  it("should group numbers correctly into multiple groups based on maxDiscrepancy", () => {
    const result = filterOutliers([5, 10, 15, 200, 210, 220, 500], 100);
    expect(result.representativeGroup).toEqual([5, 10, 15]);
    expect(result.outliers).toEqual([200, 210, 220, 500]);
  });

  it("should group numbers correctly into multiple groups based on maxDiscrepancy", () => {
    const result = filterOutliers([1, 2, 5, 10, 15, 200, 210, 220, 500], 100);
    expect(result.representativeGroup).toEqual([1, 2, 5, 10, 15]);
    expect(result.outliers).toEqual([200, 210, 220, 500]);
  });

  it("should group numbers correctly into multiple groups based on maxDiscrepancy", () => {
    const result = filterOutliers([100, 201, 301, 401], 100);
    expect(result.representativeGroup).toEqual([100]);
    expect(result.outliers).toEqual([201, 301, 401]);
  });

  it("should group all numbers into a single group if they are within maxDiscrepancy", () => {
    const result = filterOutliers([5, 10, 15, 95], 100);
    expect(result.representativeGroup).toEqual([5, 10, 15, 95]);
    expect(result.outliers).toEqual([]);
  });

  it("should treat all numbers as separate groups if they are all outside maxDiscrepancy of each other", () => {
    const result = filterOutliers([5, 150, 300, 460], 100);
    expect(result.representativeGroup).toEqual([5]);
  });

  it("should select the biggest possible group", () => {
    const result = filterOutliers([1, 2, 3, 100, 101, 102, 103, 104], 100);
    expect(result.representativeGroup).toEqual([100, 101, 102, 103, 104]);
  });
});

describe("monotonic cubic interpolation", () => {
  it("should throw for different lengths", () => {
    expect(() => monotoneCubicInterpolation([1, 2], [3])).toThrow();
  });

  it("should throw for empty arrays", () => {
    expect(() => monotoneCubicInterpolation([], [])).toThrow();
  });

  it("should throw for one point", () => {
    expect(() => monotoneCubicInterpolation([0], [0])).toThrow();
  });

  it("should throw for not monotonic", () => {
    expect(() => monotoneCubicInterpolation([1, 2, 3], [12, 18, 15])).toThrow();
    expect(() => monotoneCubicInterpolation([1, 2, 3], [5, 3, 4])).toThrow();
  });

  it("should match the given points", () => {
    const xs = [1, 2, 3];
    const ys = [10, 100, 1000];
    const precision = 0.01;
    const interpolation = monotoneCubicInterpolation(xs, ys);

    expect(interpolation.forX(xs[0])).toEqual(ys[0]);
    expect(interpolation.forX(xs[1])).toEqual(ys[1]);
    expect(interpolation.forX(xs[2])).toEqual(ys[2]);
    expect(Math.abs(interpolation.forY(ys[0], precision) - xs[0])).toBeLessThan(precision);
    expect(Math.abs(interpolation.forY(ys[1], precision) - xs[1])).toBeLessThan(precision);
    expect(Math.abs(interpolation.forY(ys[2], precision) - xs[2])).toBeLessThan(precision);
  });

  it("should be monotonic", () => {
    const xs = [0, 1, 2];
    const ys = [0, 1000, 1001];
    const precision = 0.01;
    const half = 0.5;
    const interpolation = monotoneCubicInterpolation(xs, ys);

    expect(interpolation.forX(xs[0] - half)).toBeLessThan(ys[0]);
    expect(interpolation.forX(xs[0] + half)).toBeGreaterThan(ys[0]);
    expect(interpolation.forX(xs[0] + half)).toBeLessThan(ys[1]);
    expect(interpolation.forX(xs[1] + half)).toBeGreaterThan(ys[1]);
    expect(interpolation.forX(xs[1] + half)).toBeLessThan(ys[2]);
    expect(interpolation.forX(xs[2] + half)).toBeGreaterThan(ys[2]);

    expect(interpolation.forY(ys[0] - half, precision)).toBeLessThan(xs[0]);
    expect(interpolation.forY(ys[0] + half, precision)).toBeGreaterThan(xs[0]);
    expect(interpolation.forY(ys[0] + half, precision)).toBeLessThan(xs[1]);
    expect(interpolation.forY(ys[1] + half, precision)).toBeGreaterThan(xs[1]);
    expect(interpolation.forY(ys[1] + half, precision)).toBeLessThan(xs[2]);
    expect(interpolation.forY(ys[2] + half, precision)).toBeGreaterThan(xs[2]);
  });

  it("should fit a line to linear points", () => {
    const xs = [1, 2, 4, 5];
    const ys = [1, 2, 4, 5];
    const precision = 0.01;
    const interpolation = monotoneCubicInterpolation(xs, ys);

    expect(interpolation.forX(3)).toEqual(3);
    expect(Math.abs(interpolation.forY(3, precision) - 3)).toBeLessThan(precision);
  });
});

describe("Clamper", () => {
  describe("constructor", () => {
    it("should create a Clamper with valid percentages", () => {
      const clamper = new Clamper(10, 10);
      expect(clamper.upperClampMultiplier.unsafeToNumber()).toBe(1.1);
      expect(clamper.lowerClampMultiplier.unsafeToNumber()).toBe(0.9);
    });

    it("should throw for zero upperCapPercent", () => {
      expect(() => new Clamper(0, 10)).toThrow("Percentages must be > 0");
    });

    it("should throw for zero lowerClampPercent", () => {
      expect(() => new Clamper(10, 0)).toThrow("Percentages must be > 0");
    });

    it("should throw for negative upperCapPercent", () => {
      expect(() => new Clamper(-1, 10)).toThrow("Percentages must be > 0");
    });

    it("should throw for negative lowerClampPercent", () => {
      expect(() => new Clamper(10, -1)).toThrow("Percentages must be > 0");
    });

    it("should throw for lowerClampPercent equal to 100", () => {
      expect(() => new Clamper(10, 100)).toThrow("lowerClampPercent cannot exceed 100");
    });

    it("should throw for lowerClampPercent exceeding 100", () => {
      expect(() => new Clamper(10, 101)).toThrow("lowerClampPercent cannot exceed 100");
    });
  });

  describe("clamp", () => {
    it("should return newValue when lastValue is undefined", () => {
      const clamper = new Clamper(10, 10);
      const newValue = createSafeNumber(100);
      const result = clamper.clamp(newValue, undefined);
      expect(result.unsafeToNumber()).toBe(100);
    });

    it("should return newValue when within clamp range", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(100);
      const newValue = createSafeNumber(105);
      const result = clamper.clamp(newValue, lastValue);
      expect(result.unsafeToNumber()).toBe(105);
    });

    it("should clamp to upperCap when newValue exceeds upper limit", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(100);
      const newValue = createSafeNumber(120);
      const result = clamper.clamp(newValue, lastValue);
      expect(result.unsafeToNumber()).toBeCloseTo(110, 10);
    });

    it("should clamp to lowerCap when newValue is below lower limit", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(100);
      const newValue = createSafeNumber(80);
      const result = clamper.clamp(newValue, lastValue);
      expect(result.unsafeToNumber()).toBe(90);
    });

    it("should return exact cap value when newValue equals cap", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(100);
      const upperEdge = createSafeNumber(110);
      const lowerEdge = createSafeNumber(90);
      expect(clamper.clamp(upperEdge, lastValue).unsafeToNumber()).toBe(110);
      expect(clamper.clamp(lowerEdge, lastValue).unsafeToNumber()).toBe(90);
    });

    it("should handle asymmetric clamp percentages", () => {
      const clamper = new Clamper(20, 5);
      const lastValue = createSafeNumber(100);

      expect(clamper.clamp(createSafeNumber(130), lastValue).unsafeToNumber()).toBe(120);
      expect(clamper.clamp(createSafeNumber(90), lastValue).unsafeToNumber()).toBe(95);
      expect(clamper.clamp(createSafeNumber(115), lastValue).unsafeToNumber()).toBe(115);
    });

    it("should handle decimal values", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(100.5);
      const newValue = createSafeNumber(150);
      const result = clamper.clamp(newValue, lastValue);
      expect(result.unsafeToNumber()).toBeCloseTo(110.55, 10);
    });

    it("should handle zero lastValue", () => {
      const clamper = new Clamper(10, 10);
      const lastValue = createSafeNumber(0);
      const newValue = createSafeNumber(100);
      const result = clamper.clamp(newValue, lastValue);
      expect(result.unsafeToNumber()).toBe(0);
    });
  });
});
