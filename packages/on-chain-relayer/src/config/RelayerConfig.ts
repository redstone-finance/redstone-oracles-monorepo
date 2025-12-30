import { AdapterType, UpdateTriggers } from "@redstone-finance/on-chain-relayer-common";
import {
  NewestBlockType,
  RewardsPerBlockAggregationAlgorithm,
} from "@redstone-finance/rpc-providers";
import { NetworkId } from "@redstone-finance/utils";

export type RelayerConfig = OnChainRelayerEnv & ManifestConfig;

export type ConditionCheckNames = "time" | "value-deviation" | "cron";
export enum MqttDataProcessingStrategyType {
  Base = "base",
  Timestamp = "timestamp",
  Optimized = "optimized",
}

export type ManifestConfig = {
  chainName: string;
  networkId: NetworkId;
  adapterContractAddress: string;
  dataServiceId: string;
  dataFeeds: string[];
  dataPackagesNames?: string[];
  updateTriggers: Record<string, UpdateTriggers>;
  updateConditions: Record<string, ConditionCheckNames[]>;
  adapterContractType: AdapterType;
  adapterContractPackageId?: string;
  authorizedSigners?: string[];
};
export type OnChainRelayerEnv = {
  relayerIterationInterval: number;
  rpcUrls: string[];
  privateKey: string;
  gasLimit?: number;
  healthcheckPingUrl?: string;
  healthcheckMetricName?: string;
  expectedTxDeliveryTimeInMS: number;
  twoDimensionalFees: boolean;
  fallbackOffsetInMilliseconds: number;
  cacheServiceUrls?: string[];
  historicalPackagesGateways?: string[];
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
  isAuctionModel?: boolean;
  mentoMaxDeviationAllowed?: number;
  singleProviderOperationTimeout: number;
  allProvidersOperationTimeout: number;
  isNotLazy: boolean;
  fallbackSkipDeviationBasedFrequentUpdates: boolean;
  disableCustomGasOracle: boolean;
  temporaryUpdatePriceInterval: number;
  getBlockNumberTimeout: number;
  useMulticallProvider: boolean;
  multiFeedAdditionalUpdatesDeviationThreshold?: number;
  multiFeedSyncHeartbeats?: boolean;
  oevAuctionUrl?: string;
  oevMultiAuctions?: boolean;
  oevResolveAuctionTimeout: number;
  oevTotalTimeout: number;
  oevAuctionVerificationTimeout?: number;
  oevVerifyGasPriceDisabled: boolean;
  enableEnhancedRequestDataPackagesLogs?: boolean;
  waitForAllGatewaysTimeMs?: number;
  dryRunWithInflux?: boolean;
  influxUrl?: string;
  influxToken?: string;
  ethersPollingIntervalInMs?: number;
  runWithMqtt?: boolean;
  mqttEndpoint?: string;
  mqttUpdateSubscriptionIntervalMs?: number;
  mqttMinimalOffChainSignersCount?: number;
  mqttWaitForOtherSignersMs?: number;
  mqttFallbackMaxDelayBetweenPublishesMs?: number;
  mqttFallbackCheckIntervalMs?: number;
  mqttDataProcessingStrategy?: MqttDataProcessingStrategyType;
  mqttMaxReferenceValueDeviationPercent?: number;
  mqttMaxReferenceValueDelayInSeconds?: number;
  mqttMinReferenceValues?: number;
  authorizedSigners?: string[];
  includeAdditionalFeedsForGasOptimization: boolean;
  percentileOfPriorityFee?: number;
  numberOfBlocksForFeeHistory?: number;
  newestBlockForFeeHistory?: NewestBlockType;
  isPausedUntil?: Date;
  feedsSplit?: string[][];
  splitAllFeeds?: boolean;
  uniqueSignerThresholdCacheTtlMs: number;
  fastBroadcastMode?: boolean;
  txNonceStaleThresholdMs?: number;
  minTxDeliveryTimeMs?: number;
  splitWaitingForTxRetries?: number;
  telemetryUrl?: string;
  telemetryAuthorizationToken?: string;
  telemetryBatchSendingIntervalMs?: number;
  getSingleNonceTimeoutMs?: number;
  minAggregatedRewardsPerBlockForPercentile?: number;
  rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm;
};
