import {
  AdapterType,
  UpdateTriggers,
} from "@redstone-finance/on-chain-relayer-common";
import { NewestBlockType } from "@redstone-finance/rpc-providers";
import { NetworkId } from "@redstone-finance/utils";

export type RelayerConfig = OnChainRelayerEnv & ManifestConfig;

export type ConditionCheckNames = "time" | "value-deviation" | "cron";

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
  authorizedSigners?: string[];
  includeAdditionalFeedsForGasOptimization: boolean;
  newestBlockForFeeHistory?: NewestBlockType;
  isPausedUntil?: Date;
  feedsSplit?: string[][];
  splitAllFeeds?: boolean;
};
