import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import _ from "lodash";
import { version } from "../../package.json";
import type { DataPackagesResponseCache } from "../DataPackagesResponseCache";
import {
  DataPackagesRequestParams,
  extractSignedDataPackagesForFeedId,
  requestDataPackages,
} from "../request-data-packages";
import {
  DataPackagesResponse,
  filterRetainingPackagesForDataFeedIds,
  getResponseFeedIds,
} from "../request-data-packages-common";
import { convertDataPackagesResponse } from "../request-redstone-payload";

export const DEFAULT_COMPONENT_NAME = "data-packages-wrapper";

const BYTES32_HEX_LENGTH = 32 * 2 + "0x".length;
const TRAILING_NULLS_REGEXP = /\0+$/;

export type SplitPayloads<T> = {
  [p: string]: T;
};

type UnsignedMetadataArgs = {
  withUnsignedMetadata: boolean;
  metadataTimestamp?: number;
  componentName?: string;
};

export class ContractParamsProvider {
  constructor(
    public readonly requestParams: DataPackagesRequestParams,
    private readonly cache?: DataPackagesResponseCache,
    private readonly overrideRequestParamsPackagesIds?: string[]
  ) {}

  copyForFeedId(feedId: string) {
    return this.copyForFeedIds([feedId]);
  }

  copyWithOverriddenFeedIds(feedIds: string[]) {
    return new ContractParamsProvider(this.requestParams, this.cache, feedIds);
  }

  copyForFeedIds(feedIds: string[]) {
    return new ContractParamsProvider(
      {
        ...this.requestParams,
        dataPackagesIds: feedIds,
        returnAllPackages: false,
      },
      this.cache
    );
  }

  static forFeedIds(
    requestParams: Omit<DataPackagesRequestParams, "dataPackagesIds">,
    feedIds: string[],
    cache?: DataPackagesResponseCache
  ) {
    return requestParams.returnAllPackages
      ? new ContractParamsProvider({ ...requestParams, returnAllPackages: true }, cache, feedIds)
      : new ContractParamsProvider(
          { ...requestParams, dataPackagesIds: feedIds, returnAllPackages: undefined },
          cache
        );
  }

  splitIntoFeedBatches(batchSize: number) {
    const feedIds = this.getDataFeedIds();

    return _.chunk(feedIds, batchSize).map((feedIds) => this.copyForFeedIds(feedIds));
  }

  static hexlifyFeedId(feedId: string) {
    return RedstoneCommon.hexlify(RedstoneCommon.toUtf8Bytes(feedId));
  }

  static hexlifyFeedIdAsBytes32(feedId: string) {
    return this.hexlifyFeedId(feedId).padEnd(BYTES32_HEX_LENGTH, "0");
  }

  static hexlifyFeedIds(feedIds: string[]) {
    return feedIds.map((feedId) => this.hexlifyFeedId(feedId));
  }

  static hexlifyFeedIdsAsBytes32(feedIds: string[]) {
    return feedIds.map((feedId) => this.hexlifyFeedIdAsBytes32(feedId));
  }

  static unhexlifyFeedId(hexlifiedFeedId: RedstoneCommon.BytesLike) {
    return RedstoneCommon.toUtf8String(hexlifiedFeedId).replace(TRAILING_NULLS_REGEXP, "");
  }

  static arrayifyFeedId(feedId: string) {
    return Array.from(RedstoneCommon.arrayify(feedId));
  }

  async getPayloadHex(
    withPrefix = true,
    unsignedMetadataArgs?: UnsignedMetadataArgs
  ): Promise<string> {
    return (withPrefix ? "0x" : "") + (await this.requestPayload(unsignedMetadataArgs));
  }

  async getPayloadData(unsignedMetadataArgs?: UnsignedMetadataArgs): Promise<number[]> {
    return Array.from(
      RedstoneCommon.arrayify(await this.getPayloadHex(true, unsignedMetadataArgs))
    );
  }

  getHexlifiedFeedIds(): string[] {
    return ContractParamsProvider.hexlifyFeedIds(this.getDataFeedIds());
  }

  getHexlifiedFeedIdsAsBytes32(): string[] {
    return ContractParamsProvider.hexlifyFeedIdsAsBytes32(this.getDataFeedIds());
  }

  getArrayifiedFeedIds(): Array<number>[] {
    return this.getHexlifiedFeedIds().map(ContractParamsProvider.arrayifyFeedId);
  }

  getDataFeedIds(): string[] {
    return this.overrideRequestParamsPackagesIds ?? this.requestParams.dataPackagesIds!;
  }

  async requestDataPackages(canUpdateCache = false) {
    const cachedResponse = this.cache?.get(this.requestParams, !canUpdateCache);
    if (cachedResponse) {
      return this.maybeFilterDataPackagesResponse(cachedResponse);
    }

    const dataPackagesResponse = await this.performRequestingDataPackages();

    if (canUpdateCache) {
      this.cache?.update(dataPackagesResponse, this.requestParams);
    }

    return this.maybeFilterDataPackagesResponse(dataPackagesResponse);
  }

  private maybeFilterDataPackagesResponse(dataPackagesResponse: DataPackagesResponse) {
    return this.overrideRequestParamsPackagesIds
      ? filterRetainingPackagesForDataFeedIds(
          dataPackagesResponse,
          this.overrideRequestParamsPackagesIds
        )
      : dataPackagesResponse;
  }

  async requestDataPackagesWithFeedsInfo() {
    const requestedFeedIds = this.getDataFeedIds();
    const dataPackages = await this.requestDataPackages();
    const feedsFromResponse = getResponseFeedIds(dataPackages);

    const missingFeeds = requestedFeedIds.filter(
      (feed) => !(feed in dataPackages) && !feedsFromResponse.includes(feed)
    );

    return {
      feedsFromResponse: feedsFromResponse.filter((feed) => requestedFeedIds.includes(feed)),
      missingFeeds,
      dataPackages,
      requestedFeedIds,
    };
  }

  protected async performRequestingDataPackages() {
    return await requestDataPackages(this.requestParams);
  }

  protected async requestPayload(unsignedMetadataArgs?: UnsignedMetadataArgs) {
    return convertDataPackagesResponse(
      await this.requestDataPackages(),
      "string",
      ContractParamsProvider.getUnsignedMetadata(unsignedMetadataArgs)
    );
  }

  async prepareSplitPayloads(unsignedMetadataArgs?: UnsignedMetadataArgs) {
    const dataPackagesResponse = await this.requestDataPackages();

    const result: SplitPayloads<string | undefined> = {};

    for (const feedId of this.getDataFeedIds()) {
      const dataPackages = extractSignedDataPackagesForFeedId(dataPackagesResponse, feedId);

      if (!dataPackages.length) {
        result[feedId] = undefined;
        continue;
      }

      result[feedId] = convertDataPackagesResponse(
        { [feedId]: dataPackages },
        "string",
        ContractParamsProvider.getUnsignedMetadata(unsignedMetadataArgs)
      );
    }

    return result;
  }

  static extractMissingValues<K>(payloads: SplitPayloads<K | undefined>, logger?: RedstoneLogger) {
    const missingFeedIds = _.keys(
      _.pickBy(payloads, (value: K | undefined) => value === undefined)
    );

    const filteredPayloads = _.omitBy(payloads, (value) => value === undefined) as SplitPayloads<K>;

    if (missingFeedIds.length) {
      logger?.warn(`No data packages found for [${missingFeedIds.toString()}]`);
    }

    return { missingFeedIds, payloads: filteredPayloads };
  }

  static getUnsignedMetadata(args?: UnsignedMetadataArgs) {
    if (!args) {
      return undefined;
    }

    return `${args.metadataTimestamp ?? Date.now()}#${version}#${args.componentName ?? DEFAULT_COMPONENT_NAME}`;
  }
}
