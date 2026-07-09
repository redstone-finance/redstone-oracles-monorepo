export const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000;

export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  maxPriorityFeePerTxInLamports: 60_000_000,
  basePricePerComputeUnit: 100_000,
  gasMultiplier: 4,
  maxTxAttempts: 7,
  expectedTxDeliveryTimeMs: 4_000,
  useAggressiveGasOracle: true,
  percentileOfPriorityFee: 80,
};

export interface SolanaConfig {
  maxPriorityFeePerTxInLamports: number;
  basePricePerComputeUnit: number;
  gasMultiplier: number;
  maxTxAttempts: number;
  expectedTxDeliveryTimeMs: number;
  useAggressiveGasOracle: boolean;
  percentileOfPriorityFee: number;
}

export function createSolanaConfig(args: {
  gasLimit?: number;
  gasMultiplier?: number;
  basePricePerComputeUnit?: number;
  maxTxSendAttempts?: number;
  expectedTxDeliveryTimeMs?: number;
  useAggressiveGasOracle?: boolean;
  percentileOfPriorityFee?: number;
}) {
  const gasMultiplier = args.gasMultiplier ?? DEFAULT_SOLANA_CONFIG.gasMultiplier;
  const maxTxAttempts = args.maxTxSendAttempts ?? DEFAULT_SOLANA_CONFIG.maxTxAttempts;
  const maxPriorityFeePerTxInLamports =
    args.gasLimit ?? DEFAULT_SOLANA_CONFIG.maxPriorityFeePerTxInLamports;
  const expectedTxDeliveryTimeMs =
    args.expectedTxDeliveryTimeMs ?? DEFAULT_SOLANA_CONFIG.expectedTxDeliveryTimeMs;
  const useAggressiveGasOracle =
    args.useAggressiveGasOracle ?? DEFAULT_SOLANA_CONFIG.useAggressiveGasOracle;
  const basePricePerComputeUnit =
    args.basePricePerComputeUnit ?? DEFAULT_SOLANA_CONFIG.basePricePerComputeUnit;
  const percentileOfPriorityFee =
    args.percentileOfPriorityFee ?? DEFAULT_SOLANA_CONFIG.percentileOfPriorityFee;

  return {
    ...DEFAULT_SOLANA_CONFIG,
    gasMultiplier,
    maxPriorityFeePerTxInLamports,
    basePricePerComputeUnit,
    maxTxAttempts,
    expectedTxDeliveryTimeMs,
    useAggressiveGasOracle,
    percentileOfPriorityFee,
  };
}

export function maxPricePerComputeUnit(
  { maxPriorityFeePerTxInLamports }: SolanaConfig,
  computeUnits: number
) {
  return Math.floor(
    (maxPriorityFeePerTxInLamports * MICRO_LAMPORTS_PER_LAMPORT) / Math.max(1, computeUnits)
  );
}
