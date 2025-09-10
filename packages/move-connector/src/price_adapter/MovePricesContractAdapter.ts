import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { MovePriceAdapterContractViewer } from "./MovePriceAdapterContractViewer";
import { MovePriceAdapterContractWriter } from "./MovePriceAdapterContractWriter";

export class MovePricesContractAdapter implements IMultiFeedPricesContractAdapter {
  private readonly logger = loggerFactory("move-contract-adapter");

  constructor(
    private readonly viewer: MovePriceAdapterContractViewer,
    private readonly writer?: MovePriceAdapterContractWriter
  ) {}

  getSignerAddress() {
    return Promise.resolve(this.writer?.getSignerAddress().toString());
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getPricesFromPayload(_paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    if (!this.writer) {
      throw new Error("Adapter not set up for writes");
    }

    const unsignedMetadataArgs = {
      withUnsignedMetadata: true,
      metadataTimestamp: Date.now(),
    };

    const payload = paramsProvider.getPayloadHex(true, unsignedMetadataArgs);

    return await this.writer.writeAllPrices(paramsProvider.getDataFeedIds(), payload, () =>
      paramsProvider.getPayloadHex(true, unsignedMetadataArgs)
    );
  }

  async getUniqueSignerThreshold(): Promise<number> {
    return await this.viewer.viewUniqueSignerThreshold();
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    const contractData = await this.readContractData(paramsProvider.getDataFeedIds());

    return paramsProvider.getDataFeedIds().map((feedId) => contractData[feedId].lastValue);
  }

  async readLatestUpdateBlockTimestamp(feedId: string): Promise<number> {
    return (await this.readAnyRoundDetails(feedId)).lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string): Promise<number> {
    return (await this.readAnyRoundDetails(feedId)).lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[]): Promise<ContractData> {
    return await this.viewer.viewContractData(feedIds);
  }

  private async readAnyRoundDetails(feedId: string) {
    return Object.values(await this.readContractData([feedId]))[0];
  }
}
