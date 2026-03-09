import {
  AnyOnChainRelayerManifest,
  AnyOnChainRelayerManifestSchema,
  MultiFeedOnChainRelayerManifestSchema,
  OnChainRelayerManifestSchema,
  type MultiFeedOnChainRelayerManifest,
  type OnChainRelayerManifest,
} from "@redstone-finance/on-chain-relayer-common";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 100,
};

export const fetchRelayerManifest = async (
  manifestUrls: string[]
): Promise<OnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(manifestUrls, OnChainRelayerManifestSchema);
};

export const fetchMultiFeedRelayerManifest = async (
  manifestUrls: string[]
): Promise<MultiFeedOnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(manifestUrls, MultiFeedOnChainRelayerManifestSchema);
};

export const fetchAnyRelayerManifest = async (
  manifestUrls: string[]
): Promise<AnyOnChainRelayerManifest> => {
  return await fetchAndParseRelayerManifest(manifestUrls, AnyOnChainRelayerManifestSchema);
};

async function fetchAndParseRelayerManifest<O, I>(
  manifestUrls: string[],
  manifestSchema: z.ZodType<O, I>
): Promise<O> {
  for (const manifestUrl of manifestUrls) {
    try {
      const response = await RedstoneCommon.axiosGetWithRetries(manifestUrl, RETRY_CONFIG);

      return manifestSchema.parse(response.data);
    } catch (e) {
      console.log(
        `failed to fetch relayer manifest from URL ${manifestUrl}, ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
  throw new Error(`failed to fetch  relayer manifest from all URLs: ${String(manifestUrls)}`);
}
