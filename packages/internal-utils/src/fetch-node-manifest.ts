import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { LogMonitoring, LogMonitoringType } from "./LogMonitoring";

type NodesVersions = {
  main: string;
  fallback?: string;
};

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
  analysers?: {
    candle?: {
      interval: string;
      tokens: Record<string, { broadcasters?: string[] }>;
    };
  };
};

export type NodeClass = "primary" | "bolt" | "bolt-megaeth" | "hip3-node" | "hip3-proposer";

export type NodeType = "normal" | "fast" | "ws";

export const FILENAME_TO_NODE_TYPE: Record<string, NodeType> = {
  "primary-ws.json": "ws",
  "primary-fast.json": "fast",
  "megaeth-fast-multi-feed.json": "normal",
  "main.json": "normal",
  "primary.json": "normal",
  "arbitrum.json": "normal",
  "avalanche.json": "normal",
  "hip3-testnet.json": "normal",
  "hip3-mainnet.json": "normal",
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

const getDefaultNodeClassForDataServiceId = (dataServiceId: string): NodeClass =>
  dataServiceId.includes("hip3") ? "hip3-node" : "primary";

const getNodeTypeFromFilename = (manifestUrl: string): NodeType => {
  const filename = manifestUrl.match(/[^/]+\.json$/)?.[0];
  if (!filename) {
    throw new Error(`Could not extract manifest filename from URL ${manifestUrl}`);
  }

  return FILENAME_TO_NODE_TYPE[filename] ?? "normal";
};

const substituteVersion = (url: string, version: string) =>
  url
    .replaceAll("${nodeVersion}", version)
    .replaceAll("${main}", version)
    .replaceAll("${fallback}", version);

const fetchNodeManifestOld = async <ManifestType = NodeManifest>(
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
        .replace("${main}", nodeVersion.main)
        .replace("${fallback}", nodeVersion.fallback ?? "");

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

/**
 * Fetches a node manifest at an explicit version, resolving `${main}`/`${fallback}`
 * placeholders directly instead of looking the version up in the nodes-versions
 * pointer. Use when the running version is already known (e.g. from telemetry).
 */
export const fetchNodeManifestAtVersion = async <ManifestType = NodeManifest>(
  manifestUrls: string[],
  main: string,
  headers?: Record<string, string>
): Promise<ManifestType> => {
  for (const manifestUrl of manifestUrls) {
    try {
      const manifestUrlWithHash = substituteVersion(manifestUrl, main);

      return await fetchWithCache<ManifestType>(manifestUrlWithHash, headers);
    } catch (e) {
      console.log(
        `failed to fetch node manifest at version ${main}, URL ${manifestUrl}, ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  throw new Error(`failed to fetch node manifest at version ${main}, URLs ${String(manifestUrls)}`);
};

export type FetchNodeManifestConfig = {
  dataServiceId: string;
  manifestUrls: string[];
  nodeClassOverride?: NodeClass;
  headers?: Record<string, string>;
  nodesVersionsPrefixUrlOverride?: string;
  nodeName?: string;
  nodeMode?: "main" | "fallback" | "hotfix";
};

export const fetchAnyNodeManifest = async <ManifestType = NodeManifest>(
  fetchConfig: FetchNodeManifestConfig
): Promise<ManifestType> => {
  RedstoneCommon.assert(
    (fetchConfig.nodeName === undefined) === (fetchConfig.nodeMode === undefined),
    "nodeName and nodeMode needs to be always provider together: both or none"
  );
  const versionsPrefixUrl =
    fetchConfig.nodesVersionsPrefixUrlOverride ?? getNodesVersionsPrefixUrl();
  if (!versionsPrefixUrl) {
    LogMonitoring.throw(
      LogMonitoringType.UNEXPECTED_ERROR,
      "NODES_VERSIONS_PREFIX_URL must be set to fetch node manifests"
    );
  }

  const nodeClass =
    fetchConfig.nodeClassOverride ?? getDefaultNodeClassForDataServiceId(fetchConfig.dataServiceId);

  for (const manifestUrl of fetchConfig.manifestUrls) {
    try {
      const nodeType = getNodeTypeFromFilename(manifestUrl);
      const nodeVersionUrl = fetchConfig.nodeName
        ? `${versionsPrefixUrl}${nodeClass}/${fetchConfig.nodeName}/${nodeType}/${fetchConfig.nodeMode}`
        : `${versionsPrefixUrl}${nodeClass}/${nodeType}-resolved`;
      const nodeVersion = await fetchWithCache<string>(nodeVersionUrl);
      const resolvedUrl = substituteVersion(manifestUrl, nodeVersion);

      return await fetchWithCache<ManifestType>(resolvedUrl, fetchConfig.headers);
    } catch (e) {
      console.log(
        `failed to fetch node manifest for ${fetchConfig.dataServiceId} (nodeClass=${nodeClass}), URL ${manifestUrl}, ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  throw new Error(`failed to fetch node manifest for params ${JSON.stringify(fetchConfig)}`);
};

export const fetchNodeManifest = async <ManifestType = NodeManifest>(
  dataServiceId: string,
  manifestUrls: string[],
  nodeClassOverride?: NodeClass,
  headers?: Record<string, string>,
  nodesVersionsPrefixUrlOverride?: string
): Promise<ManifestType> => {
  const fetchConfig: FetchNodeManifestConfig = {
    dataServiceId,
    manifestUrls,
    nodeClassOverride,
    headers,
    nodesVersionsPrefixUrlOverride,
  };
  try {
    return await fetchAnyNodeManifest<ManifestType>(fetchConfig);
  } catch {
    // ToDo after fully migrating to new setup, throw rather than trying to use old version
  }

  console.warn("Failed to fetch the node manifest using new method, fallback to old");

  return await fetchNodeManifestOld(
    dataServiceId,
    manifestUrls,
    headers,
    nodesVersionsPrefixUrlOverride
  );
};
