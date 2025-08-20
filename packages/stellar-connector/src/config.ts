import { RedstoneCommon } from "@redstone-finance/utils";

export interface StellarConfig {
  txDeliveryMan: {
    retry: Omit<RedstoneCommon.RetryConfig, "fn">;
    timeoutMs: number;
    feeMultiplier: number;
    feeLimit: bigint;
  };
}

export const DEFAULT_STELLAR_CONFIG: StellarConfig = {
  txDeliveryMan: {
    retry: {
      maxRetries: 3,
      waitBetweenMs: 1_000,
    },
    timeoutMs: 30_000,
    feeMultiplier: 2,
    feeLimit: 1_000n,
  },
};
