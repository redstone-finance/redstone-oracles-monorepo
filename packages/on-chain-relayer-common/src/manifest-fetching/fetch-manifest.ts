import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { createManifestUrls } from "../manifest-reading";
import {
  AnyOnChainRelayerManifest,
  AnyOnChainRelayerManifestSchema,
  MANIFEST_TYPE_MULTI_FEED,
  MANIFEST_TYPE_NON_EVM,
  MANIFEST_TYPE_PRICE_FEEDS,
  ManifestType,
  MultiFeedOnChainRelayerManifest,
  MultiFeedOnChainRelayerManifestSchema,
  OnChainRelayerManifest,
  OnChainRelayerManifestSchema,
} from "../schemas";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 100,
};

export async function fetchAnyManifestWithHosts(
  manifestType: ManifestType,
  relayerName: string,
  manifestsHosts: string[],
  apikey?: string,
  gitref = "main"
): Promise<OnChainRelayerManifest | MultiFeedOnChainRelayerManifest> {
  const manifestUrls = createManifestUrls(manifestType, relayerName, manifestsHosts, gitref);

  if (manifestType === "price-feeds") {
    return await fetchAndParseRelayerManifest(manifestUrls, OnChainRelayerManifestSchema, apikey);
  }

  return await fetchAndParseRelayerManifest(
    manifestUrls,
    MultiFeedOnChainRelayerManifestSchema,
    apikey
  );
}

export async function fetchManifest(
  type: typeof MANIFEST_TYPE_PRICE_FEEDS,
  name: string,
  manifestsHosts: string[],
  apiKey?: string
): Promise<OnChainRelayerManifest>;
export async function fetchManifest(
  type: typeof MANIFEST_TYPE_MULTI_FEED,
  name: string,
  manifestsHosts: string[],
  apiKey?: string
): Promise<MultiFeedOnChainRelayerManifest>;
export async function fetchManifest(
  type: typeof MANIFEST_TYPE_NON_EVM,
  name: string,
  manifestsHosts: string[],
  apiKey?: string
): Promise<MultiFeedOnChainRelayerManifest>;
export async function fetchManifest(
  type: ManifestType,
  name: string,
  manifestsHosts: string[],
  apiKey?: string
): Promise<AnyOnChainRelayerManifest> {
  return await fetchAnyManifestWithHosts(type, name, manifestsHosts, apiKey);
}

export const fetchRelayerManifest = async (
  manifestUrls: string[],
  apiKey?: string
): Promise<OnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(manifestUrls, OnChainRelayerManifestSchema, apiKey);
};

export const fetchMultiFeedRelayerManifest = async (
  manifestUrls: string[],
  apiKey?: string
): Promise<MultiFeedOnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(
    manifestUrls,
    MultiFeedOnChainRelayerManifestSchema,
    apiKey
  );
};

export const fetchAnyRelayerManifest = async (
  manifestUrls: string[],
  apiKey?: string
): Promise<AnyOnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(manifestUrls, AnyOnChainRelayerManifestSchema, apiKey);
};

async function fetchAndParseRelayerManifest<O, I>(
  manifestUrls: string[],
  manifestSchema: z.ZodType<O, I>,
  apiKey?: string
): Promise<O> {
  for (const manifestUrl of manifestUrls) {
    try {
      const response = await RedstoneCommon.axiosGetWithRetries(manifestUrl, {
        ...RETRY_CONFIG,
        headers: { apiKey },
      });

      return manifestSchema.parse(response.data);
    } catch (e) {
      console.log(
        `failed to fetch relayer manifest from URL ${manifestUrl}, ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
  throw new Error(`failed to fetch  relayer manifest from all URLs: ${String(manifestUrls)}`);
}
