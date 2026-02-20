import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { DataPackagesResponseCache } from "./DataPackagesResponseCache";
import { DataPackagesRequestParams } from "./request-data-packages";
import {
  DataPackagesResponse,
  getResponseTimestamp,
  isResponseEmpty,
} from "./request-data-packages-common";

const DEFAULT_TTL_MS = RedstoneCommon.minToMs(5);

export class DataPackagesResponseStorage {
  private static instance = new DataPackagesResponseStorage();
  private readonly logger = loggerFactory("data-packages-response-storage");
  private readonly entries = new Map<number, DataPackagesResponseCache>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  static getInstance() {
    return DataPackagesResponseStorage.instance;
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return `DataPackagesResponseStorage(ttlMs: ${this.ttlMs} [ms]) with ${this.entries.size} entries`;
  }

  get(requestParams: DataPackagesRequestParams) {
    this.purgeStale();

    const timestamp = requestParams.historicalTimestamp;
    if (!timestamp || requestParams.returnAllPackages) {
      return undefined;
    }

    const cache = this.entries.get(timestamp);
    if (!cache) {
      this.logger.debug(`Cache not found for timestamp ${timestamp}`);

      return undefined;
    }

    const response = cache.get(DataPackagesResponseStorage.normalizeRequestParams(requestParams));

    if (!response) {
      this.logger.warn(`Cache for timestamp ${timestamp} exists, but doesn't conform`);

      return undefined;
    }

    this.logger.info(`Returning existing cache response for timestamp ${timestamp}`);

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
      this.logger.info(`Extended existing cache for timestamp ${timestamp}`);

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

  private purgeStale() {
    const now = Date.now();
    for (const [timestamp] of this.entries) {
      if (now - timestamp > this.ttlMs) {
        this.entries.delete(timestamp);
      }
    }
  }

  private static normalizeRequestParams(requestParams: DataPackagesRequestParams) {
    return { ...requestParams, historicalTimestamp: undefined };
  }
}
