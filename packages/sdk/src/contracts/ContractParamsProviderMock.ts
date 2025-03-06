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

  protected override requestPayload(): Promise<string> {
    return Promise.resolve(this.fileReader(this.filePath).toString());
  }

  override getDataFeedIds(): string[] {
    return this.overriddenFeedIds ?? super.getDataFeedIds();
  }
}
