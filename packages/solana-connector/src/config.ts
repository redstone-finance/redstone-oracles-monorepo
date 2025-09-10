// default config results in maximum fee of 0.02 Sol
export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  maxComputeUnits: 120_000,
  maxPricePerComputeUnit: 10_000_000, // max price is 10M * 120k = 0.0012 SOL
  basePricePerComputeUnit: 100_000,
  gasMultiplier: 2,
  maxTxAttempts: 8, // 2 ^ 8 =~ 10_000_000 / 100_000
  expectedTxDeliveryTimeMs: 7_000,
  useAggressiveGasOracle: true,
};

export interface SolanaConfig {
  maxComputeUnits: number;
  maxPricePerComputeUnit: number;
  basePricePerComputeUnit: number;
  gasMultiplier: number;
  maxTxAttempts: number;
  expectedTxDeliveryTimeMs: number;
  useAggressiveGasOracle: boolean;
}

export function createSolanaConfig(args: {
  gasLimit?: number;
  gasMultiplier?: number;
  basePricePerComputeUnit?: number;
  maxTxSendAttempts?: number;
  expectedTxDeliveryTimeMs?: number;
  useAggressiveGasOracle?: boolean;
}) {
  const gasMultiplier = args.gasMultiplier ?? DEFAULT_SOLANA_CONFIG.gasMultiplier;
  const maxTxAttempts = args.maxTxSendAttempts ?? DEFAULT_SOLANA_CONFIG.maxTxAttempts;
  const maxComputeUnits = args.gasLimit ?? DEFAULT_SOLANA_CONFIG.maxComputeUnits;
  const expectedTxDeliveryTimeMs =
    args.expectedTxDeliveryTimeMs ?? DEFAULT_SOLANA_CONFIG.expectedTxDeliveryTimeMs;
  const useAggressiveGasOracle =
    args.useAggressiveGasOracle ?? DEFAULT_SOLANA_CONFIG.useAggressiveGasOracle;
  const basePricePerComputeUnit =
    args.basePricePerComputeUnit ?? DEFAULT_SOLANA_CONFIG.basePricePerComputeUnit;

  return {
    ...DEFAULT_SOLANA_CONFIG,
    gasMultiplier,
    maxComputeUnits,
    basePricePerComputeUnit,
    maxTxAttempts,
    expectedTxDeliveryTimeMs,
    useAggressiveGasOracle,
  };
}
