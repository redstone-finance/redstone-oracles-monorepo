import { assert } from "../common";

export const getMedianOfBigInts = (values: bigint[]) =>
  getMedianOfSortedBigInts(
    values,
    (left, right) => left / 2n + right / 2n + ((left % 2n) + (right % 2n)) / 2n
  );

export const getCeilMedianOfBigInts = (values: bigint[]) =>
  getMedianOfSortedBigInts(values, (left, right) => {
    const remainders = (left % 2n) + (right % 2n);

    return left / 2n + right / 2n + (remainders > 0n ? remainders + 1n : remainders) / 2n;
  });

function getMedianOfSortedBigInts(
  values: bigint[],
  average: (left: bigint, right: bigint) => bigint
) {
  assert(values.length > 0, "Cannot get median value of an empty array");

  const sorted = [...values].sort((a, b) => (a < b ? -1 : 1));
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return average(sorted[middle - 1], sorted[middle]);
  } else {
    return sorted[middle];
  }
}
