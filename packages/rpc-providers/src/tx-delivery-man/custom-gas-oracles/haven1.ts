// This chain has no gas fees, gasPrice = 0 for every transaction

import type { GasOracleFn } from "../common";

export const haven1GasOracle: GasOracleFn = () =>
  Promise.resolve({
    gasPrice: 0,
  });
