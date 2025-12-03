import {
  TxDeliveryMan,
  TxDeliveryManSupportedProviders,
  TxDeliverySigner,
} from "@redstone-finance/rpc-providers";
import { RelayerConfig } from "../config/RelayerConfig";

let deliveryMan: TxDeliveryMan | undefined = undefined;
export const getTxDeliveryMan = (
  relayerConfig: RelayerConfig,
  signer: TxDeliverySigner,
  provider: TxDeliveryManSupportedProviders
) => {
  deliveryMan ??= new TxDeliveryMan(provider, signer, {
    expectedDeliveryTimeMs: relayerConfig.expectedTxDeliveryTimeInMS,
    gasLimit: relayerConfig.gasLimit,
    twoDimensionalFees: relayerConfig.twoDimensionalFees,
    multiplier: relayerConfig.gasMultiplier,
    maxAttempts: relayerConfig.maxTxSendAttempts,
    isAuctionModel: relayerConfig.isAuctionModel,
    forceDisableCustomGasOracle: relayerConfig.disableCustomGasOracle,
    percentileOfPriorityFee: relayerConfig.percentileOfPriorityFee,
    numberOfBlocksForFeeHistory: relayerConfig.numberOfBlocksForFeeHistory,
    newestBlockForFeeHistory: relayerConfig.newestBlockForFeeHistory,
    fastBroadcastMode: relayerConfig.fastBroadcastMode,
    txNonceStaleThresholdMs: relayerConfig.txNonceStaleThresholdMs,
    minTxDeliveryTimeMs: relayerConfig.minTxDeliveryTimeMs,
    splitWaitingForTxRetries: relayerConfig.splitWaitingForTxRetries,
    getSingleNonceTimeoutMs: relayerConfig.getSingleNonceTimeoutMs,
    minMaxRewardsPerBlockForPercentile: relayerConfig.minMaxRewardsPerBlockForPercentile,
  });
  return deliveryMan;
};

export const clearCachedTxDeliveryMan = () => {
  deliveryMan = undefined;
};
