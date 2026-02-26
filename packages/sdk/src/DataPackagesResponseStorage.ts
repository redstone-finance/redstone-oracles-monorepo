import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { DataPackagesResponseCache } from "./DataPackagesResponseCache";
import { DataPackagesRequestParams } from "./request-data-packages";
import {
  DataPackagesResponse,
  getResponseFeedIds,
  getResponseTimestamp,
  isResponseEmpty,
} from "./request-data-packages-common";

type Config = { ttlMs: number; latestTtlMs?: number };

const DEFAULT_CONFIG: Config = { ttlMs: RedstoneCommon.minToMs(5) };

export class DataPackagesResponseStorage {
  private static instance = new DataPackagesResponseStorage();
  private readonly logger = loggerFactory("data-packages-response-storage");
  private readonly entries = new Map<number, DataPackagesResponseCache>();
  private readonly config: Config;

  constructor(configOverride?: Partial<Config>) {
    this.config = { ...DEFAULT_CONFIG, ...configOverride };
  }

  static getInstance() {
    return DataPackagesResponseStorage.instance;
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return `DataPackagesResponseStorage(${RedstoneCommon.stringify(this.config)}) with ${this.entries.size} entries`;
  }

  get(requestParams: DataPackagesRequestParams) {
    this.purgeStale();

    const timestamp = requestParams.historicalTimestamp;
    const timestampDesc = timestamp
      ? `for ${requestParams.dataServiceId}, historicalTimestamp: ${timestamp}`
      : `for ${requestParams.dataServiceId}`;

    const cache = timestamp ? this.entries.get(timestamp) : this.getLatestEntry();
    if (!cache) {
      this.logger.debug(`Cache not found ${timestampDesc}`);

      return undefined;
    }

    const response = cache.get(DataPackagesResponseStorage.normalizeRequestParams(requestParams));

    if (!response) {
      this.logger.warn(`Cache ${timestampDesc} exists, but doesn't conform`);

      return undefined;
    }

    this.logger.info(`Returning existing cache response ${timestampDesc}`);

    return response;
  }

  set(dataPackagesResponse: DataPackagesResponse, requestParams: DataPackagesRequestParams) {
    this.purgeStale();

    if (isResponseEmpty(dataPackagesResponse)) {
      this.logger.warn("Empty data packages response");

      return;
    }

    const timestamp = getResponseTimestamp(dataPackagesResponse);
    const normalizedRequestParams =
      DataPackagesResponseStorage.normalizeRequestParams(requestParams);

    const existing = this.entries.get(timestamp);
    if (existing?.maybeExtend(dataPackagesResponse, normalizedRequestParams, true)) {
      this.logger.debug(`Extended existing cache for timestamp ${timestamp}`);

      return;
    }

    this.logger.debug(`Adding new cache entry for timestamp ${timestamp}`);

    this.entries.set(
      timestamp,
      new DataPackagesResponseCache(dataPackagesResponse, normalizedRequestParams)
    );
  }

  clear() {
    this.entries.clear();
  }

  private getLatestEntry() {
    const maxTtl = this.config.latestTtlMs;

    if (!maxTtl) {
      return undefined;
    }

    const maxKey = Math.max(...this.entries.keys());
    if (!isFinite(maxKey)) {
      return undefined;
    }

    const now = Date.now();

    if (maxKey + maxTtl < now) {
      return undefined;
    }

    return this.entries.get(maxKey);
  }

  private purgeStale() {
    const now = Date.now();
    for (const [timestamp] of this.entries) {
      if (now - timestamp > this.config.ttlMs) {
        this.entries.delete(timestamp);
      }
    }
  }

  private static normalizeRequestParams(
    requestParams: DataPackagesRequestParams,
    response?: DataPackagesResponse
  ) {
    const modifiedQuery =
      !response || !requestParams.returnAllPackages
        ? undefined
        : { dataPackagesIds: getResponseFeedIds(response), returnAllPackages: false };

    return {
      ...requestParams,
      ...modifiedQuery,
      historicalTimestamp: undefined,
      storageInstance: undefined,
    } as DataPackagesRequestParams;
  }
}
