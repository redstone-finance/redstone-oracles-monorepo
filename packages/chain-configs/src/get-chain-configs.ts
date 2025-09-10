import {
  GenericMonitoringManifest,
  getRemoteMonitoringManifestConfigFromEnv,
  resolveMonitoringManifest,
} from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import localChainConfigsManifest from "../manifest/chain-configs.json";
import { ChainConfigs, ChainConfigsById, ChainConfigsInput, ChainConfigsSchema } from "./schemas";

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

  return ChainConfigsSchema.parse(resolvedManifest);
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
