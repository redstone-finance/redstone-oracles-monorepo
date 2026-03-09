import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { LogMonitoring, LogMonitoringType } from "./LogMonitoring";

export type NodeManifest = {
  tokens: Partial<
    Record<
      string,
      { skipBroadcasting?: boolean; source?: string[]; broadcasters?: string[]; types?: string[] }
    >
  >;
  interval: number;
  defaultSource: string[];
  multiPointPackages?: Record<string, string[]>;
};

type NodesVersions = {
  main: string;
  fallback?: string;
};

const FETCH_CACHE_TTL = 120_000;

/**
 * Use only with idempotent requests
 * Cache key is the url
 */
const fetchWithCache = RedstoneCommon.memoize({
  functionToMemoize: async <T>(url: string, headers?: Record<string, string>) => {
    return (
      await RedstoneCommon.axiosGetWithRetries<T>(url, {
        maxRetries: 3,
        waitBetweenMs: 0,
        timeout: 5000,
        headers,
      })
    ).data;
  },
  ttl: FETCH_CACHE_TTL,
});

let nodesVersionsPrefixUrl: string | undefined;

const getNodesVersionsPrefixUrl = () => {
  if (!nodesVersionsPrefixUrl) {
    nodesVersionsPrefixUrl = RedstoneCommon.getFromEnv(
      "NODES_VERSIONS_PREFIX_URL",
      z.string().optional()
    );
  }
  return nodesVersionsPrefixUrl;
};

export const fetchNodeManifest = async <ManifestType = NodeManifest>(
  dataServiceId: string,
  manifestUrls: string[],
  headers?: Record<string, string>,
  nodesVersionsPrefixUrlOverride?: string
): Promise<ManifestType> => {
  const versionsPrefixUrl = nodesVersionsPrefixUrlOverride ?? getNodesVersionsPrefixUrl();
  if (!versionsPrefixUrl) {
    LogMonitoring.throw(
      LogMonitoringType.UNEXPECTED_ERROR,
      "NODES_VERSIONS_PREFIX_URL must be set to fetch node manifests"
    );
  }

  const nodeVersionsUrl = `${versionsPrefixUrl}${dataServiceId}`;
  const nodeVersion = await fetchWithCache<NodesVersions>(nodeVersionsUrl);

  for (const manifestUrl of manifestUrls) {
    try {
      const manifestUrlWithHash = manifestUrl
        // split("-") handles versions like "hotfix-primary-12345678"
        .replace("${main}", nodeVersion.main.split("-").at(-1)!)
        .replace("${fallback}", (nodeVersion.fallback ?? "").split("-").at(-1)!);
      return await fetchWithCache<ManifestType>(manifestUrlWithHash, headers);
    } catch (e) {
      console.log(
        `failed to fetch node manifest for ${dataServiceId}, URL ${manifestUrl}, node versions ${JSON.stringify(nodeVersion)}, ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
  throw new Error(
    `failed to fetch node manifest for ${dataServiceId}, URLs ${String(manifestUrls)}, node versions ${JSON.stringify(nodeVersion)}`
  );
};
