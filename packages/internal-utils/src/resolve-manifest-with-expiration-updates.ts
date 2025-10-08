import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import dayjs from "dayjs";
import _ from "lodash";
import { z } from "zod";
import { getSSMParamWithEnvFallback } from "./aws/params";

export type GenericMonitoringManifest<T = unknown> = {
  defaultConfig: T;
  temporaryConfigUpdates?: { expirationTimestamp?: string } & Partial<T>;
};

interface HostnameData {
  hostname: string;
  hasVersionInfo: boolean;
}

const DAY_IN_MS = 24 * 3600 * 1000;
const MAX_EXPIRATION_PERIOD = 7 * DAY_IN_MS;

export function resolveMonitoringManifest<T>(manifest: GenericMonitoringManifest<T>): T {
  const { defaultConfig, temporaryConfigUpdates } = manifest;

  const expirationTimestamp = validateExpirationTimestamp(
    parseExpirationTimestamp(temporaryConfigUpdates?.expirationTimestamp)
  );

  if (temporaryConfigUpdates) {
    delete temporaryConfigUpdates["expirationTimestamp"];
  }

  const applyTemporaryConfig = temporaryConfigUpdates && expirationTimestamp > Date.now();

  const finalConfig = applyTemporaryConfig
    ? _.merge(defaultConfig, temporaryConfigUpdates)
    : defaultConfig;

  return finalConfig;
}

const logger = loggerFactory("remote-monitoring-manifest-config");
export async function getRemoteMonitoringManifestConfigFromEnv(): Promise<
  | { shouldUseLocal: true }
  | {
      shouldUseLocal: false;
      manifestsHosts: string[];
      manifestsVersionHosts: string[];
      manifestsApiKey: string;
      manifestsGitRef: string;
    }
> {
  // this is hack to ease testing locally use only for that
  if (
    RedstoneCommon.getFromEnv("OVERRIDE_REMOTE_MANIFEST_WITH_LOCAL", z.boolean().default(false))
  ) {
    logger.warn(
      `OVERRIDE_REMOTE_MANIFEST_WITH_LOCAL is set to true, overriding remote manifest with local. SHOULD BE SEEN ONLY IN TESTS OR DEV ENV`
    );
    return { shouldUseLocal: true };
  }

  const manifestsHostsData = RedstoneCommon.getFromEnv(
    "MONITORING_MANIFESTS_HOSTNAMES",
    z.array(
      z.object({
        hostname: z.string(),
        hasVersionInfo: z.boolean().default(false),
      })
    )
  );
  const manifestsApiKeyPath = RedstoneCommon.getFromEnv(
    "MONITORING_MANIFESTS_APIKEY_PATH",
    z.string().optional()
  );
  const manifestsGitRef = RedstoneCommon.getFromEnv(
    "MONITORING_MANIFESTS_GITREF",
    z.string().default("main")
  );

  const manifestsApiKey = await getSSMParamWithEnvFallback(
    manifestsApiKeyPath,
    "MONITORING_MANIFESTS_APIKEY"
  );
  RedstoneCommon.assert(manifestsApiKey, "Failed to fetch manifest api key from SSM");

  return {
    shouldUseLocal: false,
    manifestsHosts: getManifestHostnames(manifestsHostsData),
    manifestsVersionHosts: getManifestHostnames(
      manifestsHostsData.filter(({ hasVersionInfo }) => hasVersionInfo)
    ),
    manifestsApiKey,
    manifestsGitRef,
  };
}

function getManifestHostnames(hostnamesData: HostnameData[]): string[] {
  return hostnamesData.map(({ hostname }) => hostname);
}

function parseExpirationTimestamp(timestamp: string | number | undefined): number {
  if (timestamp === undefined) {
    return 0;
  }

  if (typeof timestamp === "number") {
    return timestamp;
  }
  const parsedTimestamp = dayjs(timestamp).valueOf();
  if (isNaN(parsedTimestamp)) {
    throw new Error(`provided timestamp ${timestamp} cannot be parsed`);
  }
  return parsedTimestamp;
}

function validateExpirationTimestamp(timestamp: number) {
  if (timestamp > Date.now() + MAX_EXPIRATION_PERIOD) {
    throw new Error(
      `expirationTimestamp is bigger than ${(MAX_EXPIRATION_PERIOD / DAY_IN_MS).toFixed(0)} days`
    );
  }
  return timestamp;
}
