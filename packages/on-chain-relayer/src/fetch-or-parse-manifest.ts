import { AnyOnChainRelayerManifestSchema } from "@redstone-finance/on-chain-relayer-common";
import { loggerFactory } from "@redstone-finance/utils";
import axios from "axios";

export async function fetchOrParseManifest(
  manifestUrls: string[],
  localManifestData?: unknown
) {
  const manifestData =
    localManifestData ?? (await fetchManifestFromUrls(manifestUrls));
  if (!manifestData) {
    throw new Error("failed to fetch manifest from all URLs");
  }

  return AnyOnChainRelayerManifestSchema.parse(manifestData);
}

async function fetchManifestFromUrls(manifestUrls: string[]) {
  let manifestData: unknown;

  for (const url of manifestUrls) {
    try {
      manifestData = (await axios.get(url)).data;
      if (manifestData) {
        break;
      }
    } catch (e) {
      loggerFactory("fetch-or-parse-manifest").warn(
        `Error fetching manifest from url: ${url}`
      );
    }
  }

  return manifestData;
}
