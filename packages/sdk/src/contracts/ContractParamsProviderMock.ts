import { RedstonePayloadParser } from "@redstone-finance/protocol";
import _ from "lodash";
import { DataPackagesResponse } from "../request-data-packages";
import { ContractParamsProvider } from "./ContractParamsProvider";

export class ContractParamsProviderMock extends ContractParamsProvider {
  overriddenFeedIds?: string[];

  constructor(
    dataFeeds: string[],
    private filePath: string,
    private fileReader: (filePath: string) => Buffer,
    uniqueSignersCount = 0
  ) {
    super({
      uniqueSignersCount,
      dataServiceId: "",
      dataPackagesIds: dataFeeds,
      authorizedSigners: [],
    });
  }

  override copyForFeedIds(dataFeeds: string[]) {
    return new ContractParamsProviderMock(
      dataFeeds,
      this.filePath,
      this.fileReader,
      this.requestParams.uniqueSignersCount
    );
  }

  override copyWithOverriddenFeedIds(dataFeeds: string[]) {
    return new ContractParamsProviderMock(
      dataFeeds,
      this.filePath,
      this.fileReader,
      this.requestParams.uniqueSignersCount
    );
  }

  protected override requestPayload(): Promise<string> {
    return Promise.resolve(this.fileReader(this.filePath).toString());
  }

  override getDataFeedIds(): string[] {
    return this.overriddenFeedIds ?? super.getDataFeedIds();
  }

  override async requestDataPackages(
    _canUpdateCache?: boolean
  ): Promise<DataPackagesResponse> {
    const parsedPayload = new RedstonePayloadParser(
      Buffer.from(await this.requestPayload(), "hex")
    ).parse();

    return _.groupBy(
      parsedPayload.signedDataPackages,
      (sdp) => sdp.dataPackage.dataPackageId
    );
  }
}
