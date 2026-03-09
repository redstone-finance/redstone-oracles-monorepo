import { fetchNodeManifest } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import config from "../config";
import { DataPackagesResponse } from "../data-packages/data-packages.interface";

const RWA_DATA_SERVICE_PREFIX = "redstone-rwa-";

export type RwaFeedResult = Set<string> | "ALL";

const MANIFEST_URLS: Record<string, Record<string, string[]>> = {
  prod: {
    "redstone-primary-prod": [
      "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary.json",
    ],
    "redstone-arbitrum-prod": [
      "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/arbitrum.json",
      "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/arbitrum.json",
    ],
    "redstone-avalanche-prod": [
      "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/avalanche.json",
      "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/avalanche.json",
    ],
    "redstone-hip3-prod": [
      "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/hip3-mainnet.json",
      "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/hip3-mainnet.json",
    ],
  },
  dev: {
    "redstone-primary-demo": [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
    ],
    "redstone-arbitrum-demo": [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/arbitrum.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/arbitrum.json",
    ],
    "redstone-avalanche-demo": [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/avalanche.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/avalanche.json",
    ],
    "redstone-main-demo": [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/main.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/main.json",
    ],
    "redstone-hip3-demo": [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
    ],
  },
};

function getManifestUrlsForDataService(dataServiceId: string): string[] | undefined {
  const envUrls = MANIFEST_URLS[config.env] as Record<string, string[]> | undefined;
  return envUrls?.[dataServiceId];
}

export const getRwaFeedIds = RedstoneCommon.memoize({
  functionToMemoize: async (dataServiceId: string): Promise<RwaFeedResult> => {
    if (dataServiceId.startsWith(RWA_DATA_SERVICE_PREFIX)) {
      return "ALL";
    }

    const manifestUrls = getManifestUrlsForDataService(dataServiceId);
    if (!manifestUrls) {
      return new Set();
    }

    const manifest = await fetchNodeManifest(dataServiceId, manifestUrls);
    const rwaFeeds = new Set<string>();
    for (const [feedId, tokenConfig] of Object.entries(manifest.tokens)) {
      if (tokenConfig?.types?.includes("rwa")) {
        rwaFeeds.add(feedId);
      }
    }
    return rwaFeeds;
  },
  ttl: 60_000,
});

export function stripRwaMetadata(
  response: DataPackagesResponse,
  rwaFeedIds: RwaFeedResult
): DataPackagesResponse {
  if (rwaFeedIds !== "ALL" && rwaFeedIds.size === 0) {
    return response;
  }

  const result: DataPackagesResponse = {};
  for (const [key, packages] of Object.entries(response)) {
    if (!packages) {
      continue;
    }
    result[key] = packages.map((pkg) => ({
      ...pkg,
      dataPoints: pkg.dataPoints.map((point) =>
        rwaFeedIds === "ALL" || rwaFeedIds.has(point.dataFeedId)
          ? { ...point, metadata: undefined }
          : point
      ),
    }));
  }
  return result;
}
