export type TransactionStats = {
  avgInterval?: number;
  mean: number;
  median: number;
  stdDev: number;
};

export enum UpdaterType {
  main = "main",
  fallback = "fallback",
  manual = "manual",
}

export const updaterTypes = Object.values(UpdaterType);
