// default config results in maximum fee of 0.02 Sol
export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  maxComputeUnits: 120_000,
  maxPricePerComputeUnit: 10_000_000, // max price is 10M * 120k = 0.0012 SOL
  gasMultiplier: 4,
  maxTxAttempts: 8,
  expectedTxDeliveryTimeMs: 7_000,
  useAggressiveGasOracle: true,
};

export interface SolanaConfig {
  maxComputeUnits: number;
  maxPricePerComputeUnit: number;
  gasMultiplier: number;
  maxTxAttempts: number;
  expectedTxDeliveryTimeMs: number;
  useAggressiveGasOracle: boolean;
}

export function createSolanaConfig(args: {
  gasLimit?: number;
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
  expectedTxDeliveryTimeMs?: number;
  useAggressiveGasOracle?: boolean;
}) {
  const gasMultiplier =
    args.gasMultiplier ?? DEFAULT_SOLANA_CONFIG.gasMultiplier;
  const maxTxAttempts =
    args.maxTxSendAttempts ?? DEFAULT_SOLANA_CONFIG.maxTxAttempts;
  const maxComputeUnits =
    args.gasLimit ?? DEFAULT_SOLANA_CONFIG.maxComputeUnits;
  const expectedTxDeliveryTimeMs =
    args.expectedTxDeliveryTimeMs ??
    DEFAULT_SOLANA_CONFIG.expectedTxDeliveryTimeMs;
  const useAggressiveGasOracle =
    args.useAggressiveGasOracle ?? DEFAULT_SOLANA_CONFIG.useAggressiveGasOracle;

  return {
    ...DEFAULT_SOLANA_CONFIG,
    gasMultiplier,
    maxComputeUnits,
    maxTxAttempts,
    expectedTxDeliveryTimeMs,
    useAggressiveGasOracle,
  };
}
