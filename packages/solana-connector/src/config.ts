// default config results in maximum fee of 0.02 Sol
export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  maxComputeUnits: 200_000,
  maxPricePerComputeUnit: 100_000_000,
  gasMultiplier: 5.5,
  maxTxAttempts: 5,
};

export interface SolanaConfig {
  maxComputeUnits: number;
  maxPricePerComputeUnit: number;
  gasMultiplier: number;
  maxTxAttempts: number;
}

export function createSolanaConfig(args: {
  gasLimit?: number;
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
}) {
  const gasMultiplier =
    args.gasMultiplier ?? DEFAULT_SOLANA_CONFIG.gasMultiplier;
  const maxTxAttempts =
    args.maxTxSendAttempts ?? DEFAULT_SOLANA_CONFIG.maxTxAttempts;
  const maxPricePerComputeUnit = args.gasLimit
    ? Math.floor(args.gasLimit / DEFAULT_SOLANA_CONFIG.maxComputeUnits)
    : DEFAULT_SOLANA_CONFIG.maxPricePerComputeUnit;

  return {
    ...DEFAULT_SOLANA_CONFIG,
    gasMultiplier,
    maxPricePerComputeUnit,
    maxTxAttempts,
  };
}
