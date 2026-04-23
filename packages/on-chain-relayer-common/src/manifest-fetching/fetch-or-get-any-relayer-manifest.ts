import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { readAnyRelayerManifestWithUrl, splitManifestUrl } from "../manifest-reading";
import { AnyOnChainRelayerManifest } from "../schemas";
import { fetchAnyRelayerManifest } from "./fetch-manifest";

export const fetchOrGetAnyRelayerManifest = async (
  manifestUrls: string[],
  isLocal?: boolean,
  apiKey?: string
): Promise<AnyOnChainRelayerManifest> => {
  isLocal ??= RedstoneCommon.getFromEnv(
    "OVERRIDE_REMOTE_MANIFEST_WITH_LOCAL",
    z.boolean().default(false)
  );

  if (isLocal) {
    try {
      return readAnyRelayerManifestWithUrl(manifestUrls[0]);
    } catch (e) {
      console.error(
        `Failed to read manifest for ${splitManifestUrl(manifestUrls[0]).filename}, defaulting to env config. ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  return await fetchAnyRelayerManifest(manifestUrls, apiKey);
};
