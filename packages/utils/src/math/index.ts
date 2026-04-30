import Decimal from "decimal.js";
import { BigNumber, BigNumberish } from "ethers";
import * as ISafeNumberMath from "../ISafeNumber";
import { ISafeNumber, createSafeNumber } from "../ISafeNumber";
import { assert, bignumberishToDecimal } from "../common";

export * from "./monotonic-cubic-spline";

export type ConvertibleToISafeNumber = number | string | Decimal | ISafeNumber | BigNumber;

export const castToISafeNumber = (numberLike: ConvertibleToISafeNumber | null): ISafeNumber => {
  if (numberLike === null) {
    throw new Error(`Can not cast null to ISafeNumber`);
  }
  if (typeof numberLike === "string" || typeof numberLike === "number") {
    return createSafeNumber(numberLike.toString());
  } else if (numberLike instanceof Decimal) {
    return createSafeNumber(numberLike.toString());
  } else if (numberLike instanceof BigNumber) {
    return createSafeNumber(bignumberishToDecimal(numberLike).toString());
  } else if (numberLike.isSafeNumber()) {
    return numberLike;
  } else {
    throw new Error(`Can not cast ${String(numberLike)} to ISafeNumber`);
  }
};

export const calculateSum = (numbers: ConvertibleToISafeNumber[]) =>
  ISafeNumberMath.calculateSum(numbers.map(castToISafeNumber)).unsafeToNumber();

export const calculateDeviationPercent = (args: {
  baseValue: ConvertibleToISafeNumber;
  deviatedValue: ConvertibleToISafeNumber;
}) =>
  ISafeNumberMath.calculateDeviationPercent({
    baseValue: castToISafeNumber(args.baseValue),
    deviatedValue: castToISafeNumber(args.deviatedValue),
  }).unsafeToNumber();

export const getMedian = (numbers: ConvertibleToISafeNumber[]) =>
  ISafeNumberMath.getMedian(numbers.map(castToISafeNumber)).unsafeToNumber();

export const getMedianOfBigNumbers = (numbers: BigNumberish[]) =>
  ISafeNumberMath.getMedian(numbers.map(BigNumber.from).map(castToISafeNumber)).unsafeToNumber();

export class PrecisionScaler {
  readonly tokenDecimalsScaler: Decimal;

  constructor(readonly tokenDecimals: number) {
    this.tokenDecimalsScaler = new Decimal(10).pow(tokenDecimals);
  }

  toSolidityValue(floatNumber: Decimal.Value): string {
    return new Decimal(floatNumber).mul(this.tokenDecimalsScaler).toString();
  }

  fromSolidityValue(contractValue: BigNumberish): Decimal {
    return bignumberishToDecimal(contractValue).div(this.tokenDecimalsScaler);
  }
}

/** Results are sorted in ascending order */
export const filterOutliers = (
  numbers: number[],
  maxDiscrepancy: number
): { representativeGroup: number[]; outliers: number[] } => {
  // if we have only 2 values, we can't set which is outlier which not, so we return two of them
  if (numbers.length <= 2) {
    return { representativeGroup: [...numbers], outliers: [] };
  }

  const sortedNumbers = [...numbers];
  sortedNumbers.sort((a, b) => a - b);

  let bestGroup = { startIndex: 0, endIndex: 0 };

  for (let startIndex = bestGroup.startIndex; startIndex < sortedNumbers.length; startIndex++) {
    for (let endIndex = sortedNumbers.length; startIndex < endIndex; endIndex--) {
      const firstElementValue = sortedNumbers[startIndex];
      const lastElementValue = sortedNumbers[endIndex - 1];

      if (lastElementValue - firstElementValue < maxDiscrepancy) {
        if (endIndex - startIndex > bestGroup.endIndex - bestGroup.startIndex) {
          bestGroup = { startIndex, endIndex };
        }
      }
    }
  }

  return {
    representativeGroup: sortedNumbers.slice(bestGroup.startIndex, bestGroup.endIndex),
    outliers: [
      ...sortedNumbers.slice(0, bestGroup.startIndex),
      ...sortedNumbers.slice(bestGroup.endIndex, sortedNumbers.length),
    ],
  };
};

/** Returns -1 for empty list */
export const weightedRandom = (weights: number[]): number => {
  let totalWeight = 0;

  for (const weight of weights) {
    totalWeight += weight;
  }

  let random = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random < 0) {
      return i;
    }
  }

  return weights.length - 1;
};

export const sumBy = <T>(array: T[], extract: (item: T) => number) => {
  const numbers = array.map(extract);

  if (numbers.some((number) => typeof number !== "number")) {
    throw new Error("Can't sumBy because after extraction at least one of elements is not number");
  }

  return numbers.reduce((acc, curr) => acc + curr, 0);
};

export function weightedMedian(values: number[], weights: number[]) {
  assert(
    values.length === weights.length,
    "weightedMedian requires values and weights has same length"
  );
  const pairs = values.map((v, i) => [v, weights[i]]).sort((a, b) => a[0] - b[0]);
  const total = weights.reduce((a, b) => a + b);
  let cum = 0;
  for (const [val, weight] of pairs) {
    cum += weight;
    if (cum >= total / 2) {
      return val;
    }
  }
  throw new Error(`failed to calculate weighted median`);
}

/**
 * Partition arr[lo..hi] so that arr[k] is the element that would appear at
 * position k in a sorted copy of the array.  All elements at indices < k are
 * ≤ arr[k]; all elements at indices > k are ≥ arr[k].
 *
 * Uses the middle element as pivot — good enough for the random/near-random
 * numeric data this function is designed for.
 *
 * MUTATES arr in place.
 */
function quickSelect(arr: number[], lo: number, hi: number, k: number): void {
  while (lo < hi) {
    const pivotPos = (lo + hi) >> 1;
    const pivot = arr[pivotPos];
    arr[pivotPos] = arr[hi];
    arr[hi] = pivot;

    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (arr[i] <= pivot) {
        const tmp = arr[store];
        arr[store] = arr[i];
        arr[i] = tmp;
        store++;
      }
    }
    arr[hi] = arr[store];
    arr[store] = pivot;

    if (store === k) {
      return;
    }
    if (store < k) {
      lo = store + 1;
    } else {
      hi = store - 1;
    }
  }
}

/**
 * Returns the median of `arr` in **O(n) average time** using the QuickSelect
 * algorithm, with no extra allocation.
 *
 * **MUTATES the input array.**  Only call this with an array you own and
 * will not read again after the call.  If you need to preserve the original
 * order, copy the array first: `superFastMedian([...original])`.
 *
 * For even-length arrays the median is the average of the two middle elements
 * (same definition as `MathUtils.getMedian`).
 *
 * Why this is faster than a sort-based median:
 *   - O(n) average comparisons vs O(n log n) for a full sort
 *   - No copy allocation
 *   - Tight numeric loop — no JS comparator function call per comparison
 */
export function superFastMedian(arr: number[]): number {
  if (arr.length === 0) {
    throw new Error("Cannot get median of an empty array");
  }

  const n = arr.length;
  const mid = n >> 1;
  quickSelect(arr, 0, n - 1, mid);

  if (n % 2 === 1) {
    return arr[mid];
  }

  // Even-length: arr[mid] is the upper median after partitioning.
  // All arr[0..mid-1] are ≤ arr[mid], so the lower median is simply
  // the maximum of that left partition — found in one O(n) linear scan.
  let lowerMedian = arr[0];
  for (let i = 1; i < mid; i++) {
    if (arr[i] > lowerMedian) {
      lowerMedian = arr[i];
    }
  }
  return (lowerMedian + arr[mid]) / 2;
}

export class Clamper {
  readonly upperClampMultiplier: ISafeNumber;
  readonly lowerClampMultiplier: ISafeNumber;

  constructor(upperCapPercent: number, lowerClampPercent: number) {
    if (upperCapPercent <= 0 || lowerClampPercent <= 0) {
      throw new Error("Percentages must be > 0");
    }
    if (lowerClampPercent >= 100) {
      throw new Error("lowerClampPercent cannot exceed 100");
    }

    this.upperClampMultiplier = createSafeNumber(1 + upperCapPercent / 100);
    this.lowerClampMultiplier = createSafeNumber(1 - lowerClampPercent / 100);
  }

  /** if lastValue is undefined returns newValue without capping
   * supports only positive numbers
   */
  clamp(newValue: ISafeNumber, lastValue: ISafeNumber | undefined): ISafeNumber {
    if (lastValue === undefined) {
      return newValue;
    }

    const upperCap = lastValue.mul(this.upperClampMultiplier);
    const lowerCap = lastValue.mul(this.lowerClampMultiplier);

    if (newValue.gt(upperCap)) {
      return upperCap;
    } else if (newValue.lt(lowerCap)) {
      return lowerCap;
    }

    return newValue;
  }
}
