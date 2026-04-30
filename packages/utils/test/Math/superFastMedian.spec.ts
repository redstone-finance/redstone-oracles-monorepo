import { MathUtils } from "../../src";

const { superFastMedian } = MathUtils;

// ---------------------------------------------------------------------------
// Reference implementation used for fuzz comparison.
// Simple, obviously-correct sort-based median — no mutation.
// ---------------------------------------------------------------------------
function referenceMedian(input: number[]): number {
  const sorted = [...input].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

describe("superFastMedian — deterministic cases", () => {
  it("throws on empty array", () => {
    expect(() => superFastMedian([])).toThrow();
  });

  it("single element", () => {
    expect(superFastMedian([42])).toBe(42);
    expect(superFastMedian([0])).toBe(0);
    expect(superFastMedian([-7])).toBe(-7);
  });

  // 2-element (even)
  it("two elements — average of both", () => {
    expect(superFastMedian([1, 3])).toBe(2);
    expect(superFastMedian([3, 1])).toBe(2);
    expect(superFastMedian([0, 0])).toBe(0);
    expect(superFastMedian([-4, 4])).toBe(0);
  });

  // 3-element (odd)
  it("three elements — middle value regardless of order", () => {
    expect(superFastMedian([1, 2, 3])).toBe(2);
    expect(superFastMedian([3, 1, 2])).toBe(2);
    expect(superFastMedian([3, 2, 1])).toBe(2);
    expect(superFastMedian([2, 3, 1])).toBe(2);
  });

  // 4-element (even)
  it("four elements — average of two middles", () => {
    expect(superFastMedian([1, 2, 3, 4])).toBe(2.5);
    expect(superFastMedian([4, 3, 2, 1])).toBe(2.5);
    expect(superFastMedian([2, 4, 1, 3])).toBe(2.5);
  });

  it("all identical values", () => {
    expect(superFastMedian([5, 5, 5])).toBe(5);
    expect(superFastMedian([5, 5, 5, 5])).toBe(5);
    expect(superFastMedian([0, 0, 0, 0, 0])).toBe(0);
  });

  it("negative values", () => {
    expect(superFastMedian([-5, -3, -1])).toBe(-3);
    expect(superFastMedian([-4, -2, -3, -1])).toBe(-2.5);
  });

  it("mixed negative and positive", () => {
    expect(superFastMedian([-1, 0, 1])).toBe(0);
    expect(superFastMedian([-2, -1, 1, 2])).toBe(0);
    expect(superFastMedian([-100, 0, 100])).toBe(0);
  });

  it("floats — numerically exact", () => {
    expect(superFastMedian([3.3, 1.1, 2.2])).toBeCloseTo(2.2, 10);
    expect(superFastMedian([4.0, 1.0, 3.0, 2.0])).toBe(2.5);
    expect(superFastMedian([0.1, 0.2, 0.3])).toBeCloseTo(0.2, 10);
  });

  it("already sorted — ascending", () => {
    expect(superFastMedian([1, 2, 3, 4, 5])).toBe(3);
    expect(superFastMedian([10, 20, 30, 40])).toBe(25);
  });

  it("already sorted — descending", () => {
    expect(superFastMedian([5, 4, 3, 2, 1])).toBe(3);
    expect(superFastMedian([40, 30, 20, 10])).toBe(25);
  });

  it("many duplicates with one distinct value", () => {
    expect(superFastMedian([1, 1, 1, 1, 2])).toBe(1);
    expect(superFastMedian([1, 2, 2, 2, 2])).toBe(2);
    expect(superFastMedian([1, 1, 3, 1, 1])).toBe(1);
  });

  it("power-of-2 lengths", () => {
    // Length 8: sorted [1..8] → (4+5)/2 = 4.5
    const arr8 = [8, 3, 6, 1, 7, 2, 5, 4];
    expect(superFastMedian(arr8)).toBe(4.5);

    // Length 16: sorted [1..16] → (8+9)/2 = 8.5
    const arr16 = Array.from({ length: 16 }, (_, i) => i + 1);
    for (let i = arr16.length - 1; i > 0; i--) {
      const j = i % 7; // deterministic shuffle
      [arr16[i], arr16[j]] = [arr16[j], arr16[i]];
    }
    expect(superFastMedian(arr16)).toBe(8.5);
  });

  it("known large odd array — 1..999 shuffled, median = 500", () => {
    const arr = Array.from({ length: 999 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    expect(superFastMedian(arr)).toBe(500);
  });

  it("known large even array — 1..1000 shuffled, median = 500.5", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    expect(superFastMedian(arr)).toBe(500.5);
  });

  it("oracle price range — 3000 values near 1.0", () => {
    const arr = Array.from({ length: 3000 }, () => 1.0 + (Math.random() - 0.5) * 0.002);
    const result = superFastMedian([...arr]);
    expect(result).toBeGreaterThan(0.999);
    expect(result).toBeLessThan(1.001);
  });
});

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArray(n: number, min: number, max: number): number[] {
  return Array.from({ length: n }, () => min + Math.random() * (max - min));
}

function randomIntArray(n: number, min: number, max: number): number[] {
  return Array.from({ length: n }, () => randomInt(min, max));
}

describe("superFastMedian — fuzz: matches reference for random arrays", () => {
  const RUNS = 500;

  it("small arrays (length 1–20), integers", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 20);
      const arr = randomIntArray(n, -100, 100);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 10);
    }
  });

  it("medium arrays (length 21–500), floats", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(21, 500);
      const arr = randomArray(n, -1000, 1000);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });

  it("large arrays (length 501–5000), floats", () => {
    for (let run = 0; run < 100; run++) {
      const n = randomInt(501, 5000);
      const arr = randomArray(n, 0, 1);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });

  it("all-duplicates arrays (stress-tests pivot equality)", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 200);
      const val = Math.random() * 100 - 50;
      const arr = new Array<number>(n).fill(val);
      expect(superFastMedian([...arr])).toBeCloseTo(val, 10);
    }
  });

  it("arrays with many ties (dense integer range)", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(10, 300);
      // Values only in [0, 5] — heavy collisions
      const arr = randomIntArray(n, 0, 5);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 10);
    }
  });

  it("sorted ascending inputs (worst-case for naive pivot choices)", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 300);
      const arr = Array.from({ length: n }, (_, i) => i);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 10);
    }
  });

  it("sorted descending inputs", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 300);
      const arr = Array.from({ length: n }, (_, i) => n - i);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 10);
    }
  });

  it("oracle-range values (near 1.0, tight spread)", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 3000);
      const centre = 1.0 + (Math.random() - 0.5) * 0.1;
      const arr = randomArray(n, centre * 0.999, centre * 1.001);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });

  it("extreme value ranges", () => {
    for (let run = 0; run < 200; run++) {
      const n = randomInt(1, 100);
      const arr = randomArray(n, -1e12, 1e12);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 0);
    }
  });

  it("negative-only arrays", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 200);
      const arr = randomArray(n, -500, -1);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });

  it("odd lengths only", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(0, 150) * 2 + 1; // always odd
      const arr = randomArray(n, 0, 100);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });

  it("even lengths only", () => {
    for (let run = 0; run < RUNS; run++) {
      const n = randomInt(1, 150) * 2; // always even
      const arr = randomArray(n, 0, 100);
      const expected = referenceMedian(arr);
      expect(superFastMedian([...arr])).toBeCloseTo(expected, 8);
    }
  });
});
