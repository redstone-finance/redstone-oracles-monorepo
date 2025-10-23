import { loggerFactory } from "../logger";
import { ISafeNumber } from "./ISafeNumber";
import { createSafeNumber, SafeOne, SafeZero } from "./ISafeNumberFactory";
import { calculateSum } from "./ISafeNumberMath";

const logger = loggerFactory("ISafeNumberWeighted");

export type WeightedValue = {
  value: ISafeNumber;
  weight: ISafeNumber;
};

export const getWeightedMedian = (weightedValues: WeightedValue[]): ISafeNumber => {
  if (weightedValues.length === 0) {
    throw new Error("Cannot get weighted median value of an empty array");
  }

  const sortedValues: WeightedValue[] = [...weightedValues].sort((a, b) =>
    a.value.lt(b.value) ? -1 : 1
  );

  const halfTotalWeight = calculateSum(sortedValues.map((wv) => wv.weight)).div(2);

  let cumulativeWeight = SafeZero;
  for (let i = 0; i < sortedValues.length; i++) {
    const weightedValue = sortedValues[i];
    cumulativeWeight = cumulativeWeight.add(weightedValue.weight);
    if (cumulativeWeight.gt(halfTotalWeight)) {
      return weightedValue.value;
    } else if (cumulativeWeight.eq(halfTotalWeight)) {
      return weightedValue.value.add(sortedValues[i + 1].value).div(2);
    }
  }

  throw new Error(
    "This should not happen: the accumulated weight did not exceed half of the sum of the weights"
  );
};

/**
 * limitWeights applies a dynamic weight-capping algorithm to prevent any single element
 * from exceeding a given fraction (limitRatio) of the total aggregate weight.
 * The function finds the smallest number of top elements that must be capped so that
 * all uncapped weights are <= (maxWeight = limitRatio * totalSum).
 * NOTE: count > 0, all weights non-negative
 */
export const limitWeights = (weightedValues: WeightedValue[]): WeightedValue[] => {
  const count = weightedValues.length;
  const limitRatio = getLimitRatio(count);
  if (limitRatio.gte(SafeOne)) {
    return weightedValues;
  }

  const sortedWeights = weightedValues.map((w) => w.weight).sort((a, b) => (a.lt(b) ? -1 : 1));
  let uncappedSum = calculateSum(sortedWeights);

  // We will find `maxWeight` such that:
  //  - exactly cappedCount largest elements are limited to maxWeight,
  //  - remaining (count - cappedCount) elements keep their original weights,
  //  - and the total sum after limiting satisfies maxWeight = limitRatio * newSum.
  //
  // Invariant through the loop:
  //   uncappedSum = sum(sortedWeights.slice(0, count - cappedCount))  -- sum of non-capped elements
  //   maxWeight = limitRatio * (uncappedSum + cappedCount * maxWeight)
  let maxWeight: ISafeNumber;
  for (let cappedCount = 0; cappedCount < count; cappedCount++) {
    const denominator = SafeOne.sub(limitRatio.mul(createSafeNumber(cappedCount)));
    if (denominator.lte(SafeZero)) {
      // too many elements capped
      break;
    }

    const newSum = uncappedSum.div(denominator);
    maxWeight = limitRatio.mul(newSum);

    // the next candidate for being capped (the largest uncapped element)
    const largestUncapped = sortedWeights[count - cappedCount - 1];

    // check: all uncapped <= maxWeight
    if (largestUncapped.lte(maxWeight)) {
      // we found minimal cappedCount such that all uncapped weights <= maxWeight
      break;
    }
    uncappedSum = uncappedSum.sub(largestUncapped);
  }

  // apply capping with maxWeight
  return weightedValues.map((weightedValue) => {
    let weight = weightedValue.weight;
    if (weight.gt(maxWeight)) {
      weight = maxWeight;
      logger.warn(
        `Capping weight from ${weightedValue.weight.toString()} to ${maxWeight.toString()} for value ${weightedValue.value.toString()}`
      );
    }
    return {
      value: weightedValue.value,
      weight,
    };
  });
};

/**
 * Calculates the maximum weight percentage
 * NOTE: Returned ratio must always be greater than 1/count
 */
function getLimitRatio(count: number): ISafeNumber {
  switch (true) {
    case count <= 2:
      return SafeOne; // no limit
    case count === 3:
      return createSafeNumber(0.4);
    case count <= 5:
      return createSafeNumber(0.35);
    case count <= 7:
      return createSafeNumber(0.3);
    case count <= 10:
      return createSafeNumber(0.25);
    case count <= 14:
      return createSafeNumber(0.2);
    default:
      return createSafeNumber(0.15); // 15+
  }
}

export const normalizeWeightedValues = (weightedValues: WeightedValue[]): WeightedValue[] => {
  const sum = calculateSum(weightedValues.map((value) => value.weight));
  return weightedValues.map((weightedValue) => ({
    value: weightedValue.value,
    weight: weightedValue.weight.div(sum),
  }));
};
