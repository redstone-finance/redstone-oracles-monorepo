import { readJsonFile, terminateWithRemoteConfigError } from "@redstone-finance/internal-utils";
import { AnyOnChainRelayerManifestSchema } from "@redstone-finance/on-chain-relayer-common";
import { RedstoneRemoteConfig } from "@redstone-finance/remote-config";
import { NewestBlockTypeEnum } from "@redstone-finance/rpc-providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { OnChainRelayerEnv } from "./RelayerConfig";

const DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME = 1000;

let remoteConfigPath: string | null = null;

const readManifest = () => {
  const overriddenManifest = RedstoneCommon.getFromEnv(
    "MANIFEST_OVERRIDE",
    AnyOnChainRelayerManifestSchema.optional()
  );
  if (overriddenManifest) {
    return overriddenManifest;
  }
  const manifestPath = RedstoneCommon.getFromEnv("MANIFEST_FILE", z.string());
  try {
    if (!remoteConfigPath) {
      remoteConfigPath = RedstoneRemoteConfig.findRelayerRemoteConfigOrThrow();
    }
    const manifestObject = readJsonFile(`${remoteConfigPath}/${manifestPath}`);
    return AnyOnChainRelayerManifestSchema.parse(manifestObject);
  } catch (error) {
    terminateWithRemoteConfigError(RedstoneCommon.stringifyError(error));
  }
};

export const readManifestAndEnv = () => {
  const manifest = readManifest();

  let gasLimit = RedstoneCommon.getFromEnv("GAS_LIMIT", z.number().positive().int().optional());

  const numberOfFeeds = Object.keys(manifest.priceFeeds).length;
  const gasLimitPerFeed = RedstoneCommon.getFromEnv(
    "GAS_LIMIT_PER_FEED",
    z.number().positive().int().optional()
  );

  if (gasLimit && gasLimitPerFeed) {
    throw new Error("GAS_LIMIT and GAS_LIMIT_PER_FEED cannot be set at the same time");
  }

  if (gasLimitPerFeed) {
    gasLimit = numberOfFeeds * gasLimitPerFeed;
  }

  const env: OnChainRelayerEnv = {
    gasLimit,
    disableCustomGasOracle: RedstoneCommon.getFromEnv(
      "DISABLE_CUSTOM_GAS_ORACLE",
      z.boolean().default(false)
    ),
    relayerIterationInterval: Number(
      RedstoneCommon.getFromEnv("RELAYER_ITERATION_INTERVAL", z.number())
    ),
    rpcUrls: RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.string().url())),
    singleProviderOperationTimeout: RedstoneCommon.getFromEnv(
      "SINGLE_PROVIDER_OPERATION_TIMEOUT",
      z.number().default(5_000)
    ),
    allProvidersOperationTimeout: RedstoneCommon.getFromEnv(
      "ALL_PROVIDERS_OPERATION_TIMEOUT",
      z.number().default(20_000)
    ),
    privateKey: RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string().min(16)),
    gasMultiplier: RedstoneCommon.getFromEnv("GAS_MULTIPLIER", z.number().optional()),
    maxTxSendAttempts: RedstoneCommon.getFromEnv("MAX_TX_SEND_ATTEMPTS", z.number().optional()),
    healthcheckPingUrl: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_PING_URL",
      z.string().url().optional()
    ),
    healthcheckMetricName: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_METRIC_NAME",
      z.string().optional()
    ),
    expectedTxDeliveryTimeInMS: RedstoneCommon.getFromEnv(
      "EXPECTED_TX_DELIVERY_TIME_IN_MS",
      z.number().int().positive()
    ),
    // DEPRECATED - CAN BE REMOVED AFTER IS_ARBITRUM_NETWORK IS NOT USED IN PRODUCTION
    twoDimensionalFees: RedstoneCommon.getFromEnv(
      "IS_ARBITRUM_NETWORK",
      z
        .boolean()
        .default(() =>
          RedstoneCommon.getFromEnv("TWO_DIMENSIONAL_FEES", z.boolean().default(false))
        )
    ),
    fallbackOffsetInMilliseconds: RedstoneCommon.getFromEnv(
      "FALLBACK_OFFSET_IN_MILLISECONDS",
      z.number().int()
    ),
    cacheServiceUrls: RedstoneCommon.getFromEnv(
      "CACHE_SERVICE_URLS",
      z.array(z.string().url()).optional()
    ),
    historicalPackagesGateways: RedstoneCommon.getFromEnv(
      "HISTORICAL_PACKAGES_GATEWAYS",
      z.array(z.string().url()).optional()
    ),
    isAuctionModel: RedstoneCommon.getFromEnv("IS_AUCTION_MODEL", z.boolean().default(false)),
    mentoMaxDeviationAllowed: RedstoneCommon.getFromEnv(
      "MENTO_MAX_DEVIATION_ALLOWED",
      z.number().gt(0).optional()
    ),
    isNotLazy: RedstoneCommon.getFromEnv("IS_NOT_LAZY", z.boolean().default(false)),
    fallbackSkipDeviationBasedFrequentUpdates: RedstoneCommon.getFromEnv(
      "SKIP_TX_SENDING_IF_OFFSET_MINUTES_DID_NOT_PASS",
      z.boolean().default(true)
    ),
    temporaryUpdatePriceInterval: RedstoneCommon.getFromEnv(
      "TEMPORARY_UPDATE_PRICE_INTERVAL",
      z.number().default(RedstoneCommon.minToMs(5))
    ),
    getBlockNumberTimeout: RedstoneCommon.getFromEnv(
      "BLOCK_NUMBER_TIMEOUT",
      z.number().default(1_000)
    ),
    useMulticallProvider: RedstoneCommon.getFromEnv(
      "USE_MULTICALL_PROVIDER",
      z.boolean().default(true)
    ),
    multiFeedAdditionalUpdatesDeviationThreshold: RedstoneCommon.getFromEnv(
      "MULTI_FEED_EXTRA_UPDATE_DEVIATION",
      z.number().default(0.7)
    ),
    multiFeedSyncHeartbeats: RedstoneCommon.getFromEnv(
      "MULTI_FEED_SYNC_HEARTBEATS",
      z.boolean().default(true)
    ),
    oevAuctionUrl: RedstoneCommon.getFromEnv("OEV_AUCTION_URL", z.string().optional()),
    oevMultiAuctions: RedstoneCommon.getFromEnv("OEV_MULTI_AUCTIONS", z.boolean().default(false)),
    oevResolveAuctionTimeout: RedstoneCommon.getFromEnv(
      "OEV_RESOLVE_AUCTION_TIMEOUT_MS",
      z.number().default(2000)
    ),
    oevAuctionVerificationTimeout: RedstoneCommon.getFromEnv(
      "OEV_AUCTION_VERIFICATION_TIMEOUT",
      z.number().optional()
    ),
    oevTotalTimeout: RedstoneCommon.getFromEnv("OEV_TOTAL_TIMEOUT_MS", z.number().default(10000)),
    oevVerifyGasPriceDisabled: RedstoneCommon.getFromEnv(
      "OEV_VERIFY_GAS_PRICE_DISABLED",
      z.boolean().default(false)
    ),
    enableEnhancedRequestDataPackagesLogs: RedstoneCommon.getFromEnv(
      "ENABLE_ENHANCED_REQUEST_DATA_PACKAGES_LOGS",
      z.boolean().default(true)
    ),
    waitForAllGatewaysTimeMs: RedstoneCommon.getFromEnv(
      "WAIT_FOR_ALL_GATEWAYS_TIME_MS",
      z.number().default(DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME)
    ),
    dryRunWithInflux: RedstoneCommon.getFromEnv("DRY_RUN_WITH_INFLUX", z.boolean().default(false)),
    influxUrl: RedstoneCommon.getFromEnv("INFLUX_URL", z.string().url().optional()),
    influxToken: RedstoneCommon.getFromEnv("INFLUX_TOKEN", z.string().optional()),
    ethersPollingIntervalInMs: RedstoneCommon.getFromEnv(
      "ETHERS_POLLING_INTERVAL_IN_MS",
      z.number().default(4000)
    ),
    runWithMqtt: RedstoneCommon.getFromEnv("RUN_WITH_MQTT", z.boolean().default(false)),
    mqttEndpoint: RedstoneCommon.getFromEnv("MQTT_ENDPOINT", z.string().optional()),
    mqttUpdateSubscriptionIntervalMs: RedstoneCommon.getFromEnv(
      "MQTT_UPDATE_SUBSCRIPTION_INTERVAL_MS",
      z.number().default(RedstoneCommon.minToMs(3))
    ),
    mqttMinimalOffChainSignersCount: RedstoneCommon.getFromEnv(
      "MQTT_MINIMAL_OFFCHAIN_SIGNERS_COUNT",
      z.number().optional()
    ),
    mqttWaitForOtherSignersMs: RedstoneCommon.getFromEnv(
      "MQTT_WAIT_FOR_OTHER_SIGNERS_MS",
      z.number().optional()
    ),
    mqttFallbackMaxDelayBetweenPublishesMs: RedstoneCommon.getFromEnv(
      "MQTT_FALLBACK_MAX_DELAY_BETWEEN_PUBLISHES_MS",
      z.number().optional()
    ),
    mqttFallbackCheckIntervalMs: RedstoneCommon.getFromEnv(
      "MQTT_FALLBACK_CHECK_INTERVAL_MS",
      z.number().optional()
    ),
    includeAdditionalFeedsForGasOptimization: RedstoneCommon.getFromEnv(
      "INCLUDE_ADDITIONAL_FEEDS_FOR_GAS_OPTIMIZATION",
      z.boolean().default(true)
    ),
    newestBlockForFeeHistory: RedstoneCommon.getFromEnv(
      "NEWEST_BLOCK_FOR_FEE_HISTORY",
      NewestBlockTypeEnum.optional()
    ),
    isPausedUntil: RedstoneCommon.getFromEnv(
      "IS_PAUSED_UNTIL",
      z
        .string()
        .datetime({ offset: true }) // timezone offset
        .transform((isoString) => new Date(isoString))
        .optional()
    ),
    feedsSplit: RedstoneCommon.getFromEnv("FEEDS_SPLIT", z.array(z.array(z.string())).optional()),
    splitAllFeeds: RedstoneCommon.getFromEnv("SPLIT_ALL_FEEDS", z.boolean().optional()),
    uniqueSignerThresholdCacheTtlMs: RedstoneCommon.getFromEnv(
      "UNIQUE_SIGNER_THRESHOLD_CACHE_TTL_MS",
      z.number().default(0)
    ),
  };

  return { manifest, env };
};
