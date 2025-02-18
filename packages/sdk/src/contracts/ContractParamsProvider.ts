import { hexlify } from "@ethersproject/bytes";
import { toUtf8Bytes } from "@ethersproject/strings/lib/utf8";
import { arrayify } from "ethers/lib/utils";
import { version } from "../../package.json";
import {
  convertDataPackagesResponse,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  extractSignedDataPackagesForFeedId,
  requestDataPackages,
} from "../index";

export type ContractCallPayload = {
  payload: string;
  feedId: string;
};

export const DEFAULT_COMPONENT = "data-packages-wrapper";

export class ContractParamsProvider {
  constructor(
    public readonly requestParams: DataPackagesRequestParams,
    private readonly cache?: DataPackagesResponseCache,
    private readonly overrideRequestParamsPackagesIds?: string[]
  ) {}

  static hexlifyFeedIds(feedIds: string[]) {
    return feedIds.map((feed) => hexlify(toUtf8Bytes(feed)));
  }

  async getPayloadHex(withPrefix = true): Promise<string> {
    return (withPrefix ? "0x" : "") + (await this.requestPayload());
  }

  async getPayloadData(): Promise<number[]> {
    return Array.from(arrayify(await this.getPayloadHex(true)));
  }

  getHexlifiedFeedIds(): string[] {
    return ContractParamsProvider.hexlifyFeedIds(this.getDataFeedIds());
  }

  getDataFeedIds(): string[] {
    return (
      this.overrideRequestParamsPackagesIds ??
      this.requestParams.dataPackagesIds
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

  protected async requestPayload(): Promise<string> {
    return convertDataPackagesResponse(await this.requestDataPackages());
  }

  async prepareContractCallPayloads(args: {
    onFeedPayload: (feedId: string, payload: string) => Promise<void>;
    onFeedMissing: (feedId: string) => void;
    metadataTimestamp?: number;
    component?: string;
  }) {
    const { onFeedMissing, onFeedPayload, metadataTimestamp, component } = args;
    const dataPackagesResponse = await this.requestDataPackages();

    for (const feedId of this.getDataFeedIds()) {
      const dataPackages = extractSignedDataPackagesForFeedId(
        dataPackagesResponse,
        feedId
      );

      if (!dataPackages.length) {
        onFeedMissing(feedId);
        continue;
      }

      const payload = convertDataPackagesResponse(
        { [feedId]: dataPackages },
        "string",
        ContractParamsProvider.getUnsignedMetadata(
          metadataTimestamp ?? Date.now(),
          component
        )
      );

      await onFeedPayload(feedId, payload);
    }
  }

  static getUnsignedMetadata(
    metadataTimestamp: number,
    component: string = DEFAULT_COMPONENT
  ) {
    return `${metadataTimestamp}#${version}#${component}`;
  }
}
