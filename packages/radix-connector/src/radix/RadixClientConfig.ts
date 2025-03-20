import { RedstoneCommon } from "@redstone-finance/utils";

export const DEFAULT_TRANSACTION_XRD_FEE = 1;
export const DEFAULT_INSTANTIATE_XRD_FEE = 100;
export const MAX_TIP_PERCENTAGE = 65_535; // https://docs.radixdlt.com/docs/transaction-limits
export const ALLOWED_FORWARD_EPOCH_COUNT = 100;

export interface RadixClientConfig {
  maxTxSendAttempts: number;
  maxTxWaitingTimeMs: number;
  tipMultiplier: number;
  maxFeeXrd?: number;
}

export const DEFAULT_RADIX_CLIENT_CONFIG: RadixClientConfig = {
  maxTxSendAttempts: 5,
  maxTxWaitingTimeMs: RedstoneCommon.minToMs(1),
  tipMultiplier: 1.1,
};
