import { Eip1559Fee, GasOracleFn } from "../common";

const RECOMMENDED_BASE_FEE = 1e6; // 0.001 * 1e9 (Gwei) - value recommended by megaETH
const RECOMMENDED_PRIORITY_FEE_FACTOR = 0.2; // +20%

export const megaEthGasOracle: GasOracleFn = (): Promise<Eip1559Fee> => {
  const maxPriorityFeePerGas = RECOMMENDED_BASE_FEE * RECOMMENDED_PRIORITY_FEE_FACTOR;
  const baseFee = RECOMMENDED_BASE_FEE;
  const maxFeePerGas = baseFee + maxPriorityFeePerGas;

  return Promise.resolve({
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
};
