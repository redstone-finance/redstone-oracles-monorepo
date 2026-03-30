import { CronAgent } from "@redstone-finance/agents";
import { fetchNodeManifest } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import config from "../config";
import { DataPackagesResponse } from "../data-packages/data-packages.interface";

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

const logger = loggerFactory("rwa-feed-ids");

async function fetchRwaFeedIdsForDataService(
  dataServiceId: string,
  manifestUrls: string[]
): Promise<Set<string>> {
  const manifest = await fetchNodeManifest(dataServiceId, manifestUrls);
  const rwaFeeds = new Set<string>();
  for (const [feedId, tokenConfig] of Object.entries(manifest.tokens)) {
    if (tokenConfig?.types?.includes("rwa")) {
      rwaFeeds.add(feedId);
    }
  }
  return rwaFeeds;
}

export class RwaFeedIdsProvider {
  private agents = new Map<string, CronAgent<Set<string>>>();

  async start(): Promise<void> {
    const envUrls = MANIFEST_URLS[config.env] as Record<string, string[]> | undefined;
    if (!envUrls) {
      logger.info(`No manifest URLs for env ${config.env}, skipping RWA agent init`);
      return;
    }

    const startResults = await Promise.all(
      Object.entries(envUrls).map(async ([dataServiceId, manifestUrls]) => {
        const agent = new CronAgent<Set<string>>({
          job: () => fetchRwaFeedIdsForDataService(dataServiceId, manifestUrls),
          name: `rwa-feed-ids-${dataServiceId}`,
          cronExpression: "0 * * * * *",
          maxDataTTL: RedstoneCommon.hourToMs(8),
          timeout: 10_000,
        });
        this.agents.set(dataServiceId, agent);
        const success = await agent.start();
        if (!success) {
          logger.warn(`Failed initial fetch for ${dataServiceId}`);
        }
        return success;
      })
    );
    const succeeded = startResults.filter(Boolean).length;
    logger.info(`Started ${succeeded}/${this.agents.size} RWA feed ID agents`);
  }

  getRwaFeedIds(dataServiceId: string): Set<string> | undefined {
    const agent = this.agents.get(dataServiceId);
    if (!agent) {
      return new Set();
    }

    return agent.getLastFreshMessageOrDefault();
  }

  stop(): void {
    for (const agent of this.agents.values()) {
      agent.stop();
    }
  }
}

export const rwaFeedIdsProvider = new RwaFeedIdsProvider();

export function stripRwaMetadata(
  response: DataPackagesResponse,
  rwaFeedIds: Set<string>
): DataPackagesResponse {
  if (rwaFeedIds.size === 0) {
    return response;
  }

  for (const packages of Object.values(response)) {
    if (!packages) {
      continue;
    }
    for (const pkg of packages) {
      for (const point of pkg.dataPoints) {
        if (rwaFeedIds.has(point.dataFeedId)) {
          delete point.metadata;
        }
      }
    }
  }
  return response;
}
