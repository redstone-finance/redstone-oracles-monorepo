import { RedstoneCommon, RedstoneConstants } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";

interface CacheServiceConfig {
  appPort: number;
  // empty string means that in-memory DB will be created and used
  // e.g. by e2e test process
  mongoDbUrl?: string;
  mongoDbTTLSeconds: number;
  enableDirectPostingRoutes: boolean;
  useMockOracleRegistryState: boolean;
  enableHistoricalDataServing: boolean;
  maxAllowedTimestampDelay: number;
  dataPackagesTTL: number;
  dataFeedsByFeedsEndpointMaxLimit: number;
  historicalDataPackagesTTL: number;
  metadataAccessApiKeyRegex?: RegExp;
  allFeedsAccessApiKeyRegex?: RegExp;
  keepAliveTimeoutInSeconds: number;
  influxUrl?: string;
  influxToken?: string;
  env: string;
  // feed ids (dataPackageId) excluded from persisting; supports `*XYZ` (endsWith) and `XYZ*` (startsWith)
  feedsExcludedFromDb: string[];
}

const DEFAULT_APP_PORT = 3000;

// Cache TTL can slightly increase the data delay, but having efficient
// caching is crucial for the app performance. Assuming, that we have 10s
// update frequency in nodes, 5s cache TTL on the app level, and 5s cache TTL
// on the CDN level - then the max data delay is ~20s, which is still good enough :)
const CACHE_TTL = 5000;

const config: CacheServiceConfig = {
  appPort: RedstoneCommon.getFromEnv("APP_PORT", z.number().default(DEFAULT_APP_PORT)),
  mongoDbUrl: RedstoneCommon.getFromEnv("MONGO_DB_URL", z.string().optional()),
  mongoDbTTLSeconds: RedstoneCommon.getFromEnv("MONGO_DB_TTL_SECONDS", z.number().default(0)),
  enableDirectPostingRoutes: RedstoneCommon.getFromEnv("ENABLE_DIRECT_POSTING_ROUTES", z.boolean()),
  useMockOracleRegistryState: RedstoneCommon.getFromEnv(
    "USE_MOCK_ORACLE_STATE",
    z.boolean().default(false)
  ),
  enableHistoricalDataServing: RedstoneCommon.getFromEnv(
    "ENABLE_HISTORICAL_DATA_SERVING",
    z.boolean().default(false)
  ),
  maxAllowedTimestampDelay: RedstoneCommon.getFromEnv(
    "MAX_ALLOWED_TIMESTAMP_DELAY",
    z.number().positive().default(RedstoneConstants.DEFAULT_LATEST_DATA_PACKAGES_MAX_DELAY_MS)
  ),
  dataPackagesTTL: RedstoneCommon.getFromEnv("DATA_PACKAGES_TTL", z.number().default(CACHE_TTL)),
  dataFeedsByFeedsEndpointMaxLimit: RedstoneCommon.getFromEnv(
    "DATA_FEEDS_BY_FEEDS_ENDPOINT_MAX_LIMIT",
    z.number().default(100)
  ),
  historicalDataPackagesTTL: RedstoneCommon.getFromEnv(
    "HISTORICAL_DATA_PACKAGES_TTL",
    z.number().default(30000)
  ),
  metadataAccessApiKeyRegex: RedstoneCommon.getFromEnv(
    "METADATA_ACCESS_API_KEY_REGEX",
    z
      .string()
      .optional()
      .transform((s) => (s ? new RegExp(s) : undefined))
  ),
  allFeedsAccessApiKeyRegex: RedstoneCommon.getFromEnv(
    "ALL_FEEDS_ACCESS_API_KEY_REGEX",
    z
      .string()
      .optional()
      .transform((s) => (s ? new RegExp(s) : undefined))
  ),
  keepAliveTimeoutInSeconds: RedstoneCommon.getFromEnv(
    "KEEP_ALIVE_TIMEOUT_IN_SECONDS",
    z.number().default(60)
  ),
  influxUrl: RedstoneCommon.getFromEnv("INFLUX_BROADCASTER_URL", z.string().optional()),
  influxToken: RedstoneCommon.getFromEnv("INFLUX_BROADCASTER_AUTH_TOKEN", z.string().optional()),
  env: RedstoneCommon.getFromEnv("ENV", z.string().optional().default("dev")),
  feedsExcludedFromDb: RedstoneCommon.getFromEnv(
    "FEEDS_EXCLUDED_FROM_DB",
    z.array(z.string()).default([])
  ),
};

export default config;
