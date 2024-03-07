import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import fs from "fs";
import { z } from "zod";
import { makeConfigProvider } from "./make-config-provider";
import {
  ConfigProvider,
  OnChainRelayerEnv,
  OnChainRelayerManifestSchema,
} from "./types";

// copy of method from oracle-node. Probably should be moved to some common package
const readJSON = <T>(path: string): T => {
  const content = fs.readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
};

const readManifest = () => {
  const overriddenManifest = RedstoneCommon.getFromEnv(
    "MANIFEST_OVERRIDE",
    OnChainRelayerManifestSchema.optional()
  );
  if (overriddenManifest) {
    return overriddenManifest;
  }
  const manifestPath = RedstoneCommon.getFromEnv("MANIFEST_FILE", z.string());
  const manifestObject = readJSON(manifestPath);
  return OnChainRelayerManifestSchema.parse(manifestObject);
};

export const fileSystemConfigProvider: ConfigProvider = () => {
  const manifest = readManifest();

  const env: OnChainRelayerEnv = {
    disableCustomGasOracle: RedstoneCommon.getFromEnv(
      "DISABLE_CUSTOM_GAS_ORACLE",
      z.boolean().default(false)
    ),
    relayerIterationInterval: Number(
      RedstoneCommon.getFromEnv("RELAYER_ITERATION_INTERVAL", z.number())
    ),
    rpcUrls: RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.string().url())),
    agreementAcceptableBlocksDiff: RedstoneCommon.getFromEnv(
      "AGREEMENT_ACCEPTABLE_BLOCKS_DIFF",
      z.number().default(-1)
    ),
    singleProviderOperationTimeout: RedstoneCommon.getFromEnv(
      "SINGLE_PROVIDER_OPERATION_TIMEOUT",
      z.number().default(5_000)
    ),
    allProvidersOperationTimeout: RedstoneCommon.getFromEnv(
      "ALL_PROVIDERS_OPERATION_TIMEOUT",
      z.number().default(20_000)
    ),
    privateKey: RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string().min(16)),
    gasLimit: RedstoneCommon.getFromEnv(
      "GAS_LIMIT",
      z.number().positive().int()
    ),
    gasMultiplier: RedstoneCommon.getFromEnv(
      "GAS_MULTIPLIER",
      z.number().default(1.125)
    ),
    healthcheckPingUrl: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_PING_URL",
      z.string().url().optional()
    ),
    expectedTxDeliveryTimeInMS: RedstoneCommon.getFromEnv(
      "EXPECTED_TX_DELIVERY_TIME_IN_MS",
      z.number().int().positive()
    ),
    isArbitrumNetwork: RedstoneCommon.getFromEnv(
      "IS_ARBITRUM_NETWORK",
      z.boolean().default(false)
    ),
    fallbackOffsetInMinutes: RedstoneCommon.getFromEnv(
      "FALLBACK_OFFSET_IN_MINUTES",
      z.number().int().default(0)
    ),
    cacheServiceUrls: RedstoneCommon.getFromEnv(
      "CACHE_SERVICE_URLS",
      z.array(z.string().url()).optional()
    ),
    historicalPackagesGateways: RedstoneCommon.getFromEnv(
      "HISTORICAL_PACKAGES_GATEWAYS",
      z.array(z.string().url()).optional()
    ),
    isAuctionModel: RedstoneCommon.getFromEnv(
      "IS_AUCTION_MODEL",
      z.boolean().default(false)
    ),
    mentoMaxDeviationAllowed: RedstoneCommon.getFromEnv(
      "MENTO_MAX_DEVIATION_ALLOWED",
      z.number().gt(0).optional()
    ),
    isNotLazy: RedstoneCommon.getFromEnv(
      "IS_NOT_LAZY",
      z.boolean().default(false)
    ),
    fallbackSkipDeviationBasedFrequentUpdates: RedstoneCommon.getFromEnv(
      "SKIP_TX_SENDING_IF_OFFSET_MINUTES_DID_NOT_PASS",
      z.boolean().default(true)
    ),
    temporaryUpdatePriceInterval: RedstoneCommon.getFromEnv(
      "TEMPORARY_UPDATE_PRICE_INTERVAL",
      z.number().default(RedstoneCommon.minToMs(5))
    ),
  };

  return makeConfigProvider(manifest, env);
};
