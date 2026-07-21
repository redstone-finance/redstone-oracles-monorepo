import { OevConfig } from "@redstone-finance/evm-adapters";
import { AdapterType } from "@redstone-finance/on-chain-relayer-common";
import { NetworkId, Tx } from "@redstone-finance/utils";

export type PartialRelayerConfig = {
  networkId: NetworkId;
  chainName: string;
  dataFeeds: string[];
  adapterContractAddress: string;
  adapterContractType: AdapterType;
  adapterContractPackageId?: string;
  rpcUrls: string[];
  privateKey: string;
  gasLimit?: number;
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
  expectedTxDeliveryTimeInMS?: number;
  fallbackOffsetInMilliseconds?: number;
  percentileOfPriorityFee?: number | number[];
  telemetryUrl?: string;
  telemetryAuthorizationToken?: string;
};

type EvmTxDeliveryConfig = {
  expectedTxDeliveryTimeInMS: number;
  singleProviderOperationTimeout: number;
  allProvidersOperationTimeout?: number;
  getBlockNumberTimeout: number;
  useMulticallProvider?: boolean;
  ethersPollingIntervalInMs?: number;
  telemetryBatchSendingIntervalMs?: number;
  twoDimensionalFees?: boolean;
  isAuctionModel?: boolean;
  isAuctionModelV2?: boolean;
  disableCustomGasOracle?: boolean;
  numberOfBlocksForFeeHistory?: number;
  newestBlockForFeeHistory?: Tx.NewestBlockType;
  fastBroadcastMode?: boolean;
  txNonceStaleThresholdMs?: number;
  minTxDeliveryTimeMs?: number;
  splitWaitingForTxRetries?: number;
  getSingleNonceTimeoutMs?: number;
  minAggregatedRewardsPerBlockForPercentile?: number;
  rewardsPerBlockAggregationAlgorithm: Tx.RewardsPerBlockAggregationAlgorithm;
  auctionModelGasMultipliers?: number[];
  oevMultiAuctions?: boolean;
};

export type EvmRelayerConfig = PartialRelayerConfig & EvmTxDeliveryConfig & OevConfig;
