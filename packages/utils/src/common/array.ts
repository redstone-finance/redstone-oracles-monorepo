export const removeDuplicates = <T>(arr: T[]): T[] => {
  return Array.from(new Set(arr));
};

export const getFirstAndOnly = <T>(arr: T[]): T => {
  if (arr.length !== 1) {
    throw new Error(`The array length must be 1. Real length: ${arr.length}`);
  }
  return arr[0];
};
