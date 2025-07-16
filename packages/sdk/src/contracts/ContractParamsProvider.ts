import { BytesLike, hexlify } from "@ethersproject/bytes";
import { toUtf8Bytes } from "@ethersproject/strings/lib/utf8";
import { RedstoneLogger } from "@redstone-finance/utils";
import { utils } from "ethers";
import { arrayify } from "ethers/lib/utils";
import _ from "lodash";
import { version } from "../../package.json";
import {
  convertDataPackagesResponse,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  extractSignedDataPackagesForFeedId,
  requestDataPackages,
} from "../index";

export const DEFAULT_COMPONENT_NAME = "data-packages-wrapper";

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

  static hexlifyFeedIds(
    feedIds: string[],
    allowMissingPrefix?: boolean,
    padRightSize?: number
  ) {
    return feedIds
      .map((feed) => hexlify(toUtf8Bytes(feed)), { allowMissingPrefix })
      .map((value) =>
        padRightSize
          ? value.padEnd(
              padRightSize * 2 + (value.startsWith("0x") ? 2 : 0),
              "0"
            )
          : value
      );
  }

  static unhexlifyFeedId(hexlifiedFeedId: BytesLike) {
    return utils.toUtf8String(hexlifiedFeedId).replace(/\0+$/, "");
  }

  async getPayloadHex(
    withPrefix = true,
    unsignedMetadataArgs?: UnsignedMetadataArgs
  ): Promise<string> {
    return (
      (withPrefix ? "0x" : "") +
      (await this.requestPayload(unsignedMetadataArgs))
    );
  }

  async getPayloadData(
    unsignedMetadataArgs?: UnsignedMetadataArgs
  ): Promise<number[]> {
    return Array.from(
      arrayify(await this.getPayloadHex(true, unsignedMetadataArgs))
    );
  }

  getHexlifiedFeedIds(
    allowMissingPrefix?: boolean,
    padRightSize?: number
  ): string[] {
    return ContractParamsProvider.hexlifyFeedIds(
      this.getDataFeedIds(),
      allowMissingPrefix,
      padRightSize
    );
  }

  getDataFeedIds(): string[] {
    return (
      this.overrideRequestParamsPackagesIds ??
      this.requestParams.dataPackagesIds!
    );
  }

  async requestDataPackages(canUpdateCache = false) {
    const cachedResponse = this.cache?.get(this.requestParams, !canUpdateCache);
    if (cachedResponse) {
      return cachedResponse;
    }

    const dataPackagesResponse = await this.performRequestingDataPackages();

    if (canUpdateCache) {
      this.cache?.update(dataPackagesResponse, this.requestParams);
    }

    return dataPackagesResponse;
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
      const dataPackages = extractSignedDataPackagesForFeedId(
        dataPackagesResponse,
        feedId
      );

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

  static extractMissingValues<K>(
    payloads: SplitPayloads<K | undefined>,
    logger?: RedstoneLogger
  ) {
    const missingFeedIds = _.keys(
      _.pickBy(payloads, (value: K | undefined) => value === undefined)
    );

    const filteredPayloads = _.omitBy(
      payloads,
      (value) => value === undefined
    ) as SplitPayloads<K>;

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
