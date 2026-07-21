import {
  TxDeliveryMan,
  TxDeliveryManSupportedProviders,
  TxDeliverySigner,
} from "@redstone-finance/rpc-providers";
import { EvmRelayerConfig } from "./partial-relayer-config";

let deliveryMan: TxDeliveryMan | undefined = undefined;
export const getTxDeliveryMan = (
  relayerConfig: EvmRelayerConfig,
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
    isAuctionModelV2: relayerConfig.isAuctionModelV2,
    forceDisableCustomGasOracle: relayerConfig.disableCustomGasOracle,
    percentileOfPriorityFee: relayerConfig.percentileOfPriorityFee,
    numberOfBlocksForFeeHistory: relayerConfig.numberOfBlocksForFeeHistory,
    newestBlockForFeeHistory: relayerConfig.newestBlockForFeeHistory,
    fastBroadcastMode: relayerConfig.fastBroadcastMode,
    txNonceStaleThresholdMs: relayerConfig.txNonceStaleThresholdMs,
    minTxDeliveryTimeMs: relayerConfig.minTxDeliveryTimeMs,
    splitWaitingForTxRetries: relayerConfig.splitWaitingForTxRetries,
    getSingleNonceTimeoutMs: relayerConfig.getSingleNonceTimeoutMs,
    minAggregatedRewardsPerBlockForPercentile:
      relayerConfig.minAggregatedRewardsPerBlockForPercentile,
    rewardsPerBlockAggregationAlgorithm: relayerConfig.rewardsPerBlockAggregationAlgorithm,
    auctionModelGasMultipliers: relayerConfig.auctionModelGasMultipliers,
  });

  return deliveryMan;
};

export const clearCachedTxDeliveryMan = () => {
  deliveryMan = undefined;
};
