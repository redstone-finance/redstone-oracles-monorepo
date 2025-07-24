import { RedstoneCommon } from "@redstone-finance/utils";
import {
  AnyOnChainRelayerManifest,
  MANIFEST_DIRS,
  MANIFEST_TYPE_MULTI_FEED,
  MANIFEST_TYPE_NON_EVM,
  MANIFEST_TYPE_PRICE_FEEDS,
  ManifestType,
  MultiFeedOnChainRelayerManifest,
  MultiFeedOnChainRelayerManifestSchema,
  OnChainRelayerManifest,
  OnChainRelayerManifestSchema,
} from "../schemas";

export async function fetchAnyManifest(
  type: ManifestType,
  name: string,
  manifestUrls: string[]
): Promise<OnChainRelayerManifest | MultiFeedOnChainRelayerManifest> {
  try {
    return (
      type === MANIFEST_TYPE_PRICE_FEEDS
        ? OnChainRelayerManifestSchema
        : MultiFeedOnChainRelayerManifestSchema
    ).parse(await fetchRelayerManifestWithAxios(name, type, manifestUrls));
  } catch (error) {
    throw new Error(
      `Failed to parse ${name} with manifest type ${type}, ${RedstoneCommon.stringifyError(error)}`
    );
  }
}

export async function fetchManifest(
  type: typeof MANIFEST_TYPE_PRICE_FEEDS,
  name: string,
  manifestUrls: string[]
): Promise<OnChainRelayerManifest>;
export async function fetchManifest(
  type: typeof MANIFEST_TYPE_MULTI_FEED,
  name: string,
  manifestUrls: string[]
): Promise<MultiFeedOnChainRelayerManifest>;
export async function fetchManifest(
  type: typeof MANIFEST_TYPE_NON_EVM,
  name: string,
  manifestUrls: string[]
): Promise<MultiFeedOnChainRelayerManifest>;
export async function fetchManifest(
  type: ManifestType,
  name: string,
  manifestUrls: string[]
): Promise<AnyOnChainRelayerManifest> {
  return await fetchAnyManifest(type, name, manifestUrls);
}

export const fetchRelayerManifestWithAxios = async (
  relayerName: string,
  manifestType: ManifestType,
  manifestsHosts: string[],
  apikey?: string,
  gitref = "main"
) => {
  const manifestPath = MANIFEST_DIRS[manifestType];
  for (const manifestsHost of manifestsHosts) {
    const manifestUrl = `https://${manifestsHost}/redstone-finance/redstone-monorepo-priv/${gitref}/packages/on-chain-relayer/${manifestPath}/${relayerName}.json`;
    try {
      const response = await RedstoneCommon.axiosGetWithRetries(manifestUrl, {
        maxRetries: 2,
        headers: { apikey },
      });
      return response.data;
    } catch (e) {
      console.warn(
        `failed to fetch relayer manifest from URL ${manifestUrl}, error ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
  throw new Error(
    `failed to fetch chain configs for ${JSON.stringify({ manifestsHosts, apikey })}`
  );
};
