export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  maxComputeUnits: 200_000,
  maxPricePerComputeUnit: 10_000,
  gasMultiplier: 5.5,
  maxTxAttempts: 5,
};

export interface SolanaConfig {
  maxComputeUnits: number;
  maxPricePerComputeUnit: number;
  gasMultiplier: number;
  maxTxAttempts: number;
}
