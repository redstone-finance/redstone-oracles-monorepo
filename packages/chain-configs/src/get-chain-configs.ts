import {
  GenericMonitoringManifest,
  getRemoteMonitoringManifestConfigFromEnv,
  LogMonitoring,
  LogMonitoringType,
  ManifestFallbackService,
  resolveMonitoringManifest,
} from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import localChainConfigsManifest from "../manifest/chain-configs.json";
import { ChainConfigs, ChainConfigsById, ChainConfigsInput, ChainConfigsSchema } from "./schemas";

const FALLBACK_CHAIN_CONFIGS_TABLE_NAME_ENV = "FALLBACK_CHAIN_CONFIGS_TABLE_NAME";
const FALLBACK_CHAIN_CONFIGS_METRIC_NAME_ENV = "FALLBACK_CHAIN_CONFIGS_METRIC_NAME";
const FALLBACK_CHAIN_CONFIGS_METRIC_NAMESPACE_ENV = "FALLBACK_CHAIN_CONFIGS_METRIC_NAMESPACE";
const FALLBACK_CHAIN_CONFIGS_RESOURCE_NAME_ENV = "RESOURCE_NAME";
const MANIFEST_TYPE = "chain-configs" as const;

const fallbackManifestDb = ManifestFallbackService.setupFallbackManifestDb<typeof MANIFEST_TYPE>(
  FALLBACK_CHAIN_CONFIGS_TABLE_NAME_ENV
);

export const fetchChainConfigsWithAxios = async (
  manifestsHosts: string[],
  apikey?: string,
  gitref = "main"
) => {
  for (const manifestsHost of manifestsHosts) {
    const manifestUrl = `https://${manifestsHost}/redstone-finance/redstone-monorepo-priv/${gitref}/packages/chain-configs/manifest/chain-configs.json`;
    try {
      const response = await RedstoneCommon.axiosGetWithRetries<
        GenericMonitoringManifest<ChainConfigsInput>
      >(manifestUrl, { maxRetries: 2, headers: { apikey } });
      return response.data;
    } catch (e) {
      console.log(
        `failed to fetch chain configs from URL ${manifestUrl}, error ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
  throw new Error(
    `failed to fetch chain configs for ${JSON.stringify({ manifestsHosts, apikey })}`
  );
};

const fetchChainConfigsWithCache = RedstoneCommon.memoize({
  functionToMemoize: fetchChainConfigsWithAxios,
  ttl: RedstoneCommon.minToMs(1),
});

export async function fetchChainConfigs(): Promise<ChainConfigs> {
  const config = await getRemoteMonitoringManifestConfigFromEnv();

  if (config.shouldUseLocal) {
    return getLocalChainConfigs();
  }

  const chainConfigsManifest = await fetchChainConfigsWithCache(
    config.manifestsHosts,
    config.manifestsApiKey,
    config.manifestsGitRef
  );
  const resolvedManifest = resolveMonitoringManifest(chainConfigsManifest);

  let parsedManifest;
  try {
    parsedManifest = ChainConfigsSchema.parse(resolvedManifest);
  } catch (e) {
    console.error(`Error while parsing chain configs: ${RedstoneCommon.stringifyError(e)}`);

    if (!fallbackManifestDb) {
      throw e;
    }
    console.warn("Trying to use latest known good manifest");
    try {
      const hash = await fallbackManifestDb.getLatestWorkingManifestHash(MANIFEST_TYPE);
      const fallbackManifest = await fetchChainConfigsWithCache(
        config.manifestsHosts,
        config.manifestsApiKey,
        hash
      );

      const parsedManifest = ChainConfigsSchema.parse(resolveMonitoringManifest(fallbackManifest));

      await ManifestFallbackService.triggerFallbackManifestMetric(
        FALLBACK_CHAIN_CONFIGS_RESOURCE_NAME_ENV,
        FALLBACK_CHAIN_CONFIGS_METRIC_NAME_ENV,
        FALLBACK_CHAIN_CONFIGS_METRIC_NAMESPACE_ENV
      );
      return parsedManifest;
    } catch (fallbackManifestError) {
      throw new Error(
        `Parsing manifest from main failed: ${RedstoneCommon.stringifyError(e)}. Fallback to last working version failed: ${RedstoneCommon.stringifyError(fallbackManifestError)}.`
      );
    }
  }

  if (fallbackManifestDb) {
    try {
      await fallbackManifestDb.trySaveCurrentManifestHash(
        MANIFEST_TYPE,
        config.manifestsApiKey,
        config.manifestsVersionHosts
      );
    } catch (saveHashError) {
      LogMonitoring.warn(
        LogMonitoringType.FALLBACK_MANIFEST_HASH_SAVE_FAILED,
        `Saving hash for working chain configs failed: ${RedstoneCommon.stringifyError(saveHashError)}`
      );
    }
  }
  return parsedManifest;
}

const LOCAL_CHAIN_CONFIGS = ChainConfigsSchema.parse(
  resolveMonitoringManifest(localChainConfigsManifest)
);

export function getLocalChainConfigs(): ChainConfigs {
  return LOCAL_CHAIN_CONFIGS;
}

function groupChainConfigsByNetworkId(chainConfigs: ChainConfigs): ChainConfigsById {
  const entries = Object.values(chainConfigs).map((chain) => [chain.networkId, chain]);
  return Object.fromEntries(entries) as ChainConfigsById;
}

const LOCAL_CHAIN_CONFIGS_BY_NETWORK_ID = groupChainConfigsByNetworkId(LOCAL_CHAIN_CONFIGS);

export function getLocalChainConfigsByNetworkId(): ChainConfigsById {
  return LOCAL_CHAIN_CONFIGS_BY_NETWORK_ID;
}
