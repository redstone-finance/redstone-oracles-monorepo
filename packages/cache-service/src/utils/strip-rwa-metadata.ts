import { CronAgent } from "@redstone-finance/agents";
import { fetchNodeManifest, NodeClass } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon, RedstoneTypes } from "@redstone-finance/utils";
import config from "../config";
import { DataPackagesResponse } from "../data-packages/data-packages.interface";

const MANIFEST_URLS: Record<string, Record<string, string[][]>> = {
  prod: {
    "redstone-primary-prod": [
      [
        "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary.json",
        "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      ],
      [
        "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary-ws.json",
        "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/primary-ws.json",
      ],
    ],
    "redstone-hip3-prod": [
      [
        "https://d33bwqmghwdcx3.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/hip3-mainnet.json",
        "https://d3ps2laf13blkb.cloudfront.net/redstone-finance/redstone-monorepo-priv/${fallback}/packages/node-remote-config/dev/manifests/data-services/hip3-mainnet.json",
      ],
    ],
  },
  dev: {
    "redstone-primary-demo": [
      [
        "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
        "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      ],
      [
        "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary-ws.json",
        "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary-ws.json",
      ],
    ],
    "redstone-main-demo": [
      [
        "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/main.json",
        "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/main.json",
      ],
    ],
    "redstone-hip3-demo": [
      [
        "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
        "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
      ],
    ],
  },
};

const logger = loggerFactory("rwa-feed-ids");

const DATA_SERVICE_NODE_CLASS: Partial<Record<string, NodeClass>> = {
  "redstone-primary-prod": "primary",
  "redstone-arbitrum-prod": "primary",
  "redstone-avalanche-prod": "primary",
  "redstone-hip3-prod": "hip3-node",
  "redstone-primary-demo": "primary",
  "redstone-arbitrum-demo": "primary",
  "redstone-avalanche-demo": "primary",
  "redstone-main-demo": "primary",
  "redstone-hip3-demo": "hip3-node",
};

async function fetchRwaFeedIdsForDataService(
  dataServiceId: string,
  manifestUrlGroups: string[][]
): Promise<Set<string>> {
  const nodeClass = DATA_SERVICE_NODE_CLASS[dataServiceId];
  if (!nodeClass) {
    logger.warn(`No node_class mapping for data service ${dataServiceId}`);
  }
  const rwaFeeds = new Set<string>();
  for (const manifestUrls of manifestUrlGroups) {
    const manifest = await fetchNodeManifest(dataServiceId, manifestUrls, nodeClass ?? "primary");
    for (const [feedId, tokenConfig] of Object.entries(manifest.tokens)) {
      if (tokenConfig?.types?.includes("rwa")) {
        rwaFeeds.add(feedId);
      }
    }
  }

  return rwaFeeds;
}

export class RwaFeedIdsProvider {
  private agents = new Map<string, CronAgent<Set<string>>>();

  async start() {
    const envUrls = MANIFEST_URLS[config.env] as Record<string, string[][]> | undefined;
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

  stop() {
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
        if (rwaFeedIds.has(point.dataFeedId) && point.metadata) {
          const meta = point.metadata as RedstoneTypes.MetadataForRedstonePrice;
          point.metadata = { nodeLabel: meta.nodeLabel };
        }
      }
    }
  }

  return response;
}
