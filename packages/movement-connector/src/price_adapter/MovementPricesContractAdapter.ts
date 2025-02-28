import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import { MovementPriceAdapterContractViewer } from "./MovementPriceAdapterContractViewer";
import { MovementPriceAdapterContractWriter } from "./MovementPriceAdapterContractWriter";

export class MovementPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  private readonly logger = loggerFactory("movement-contract-adapter");

  constructor(
    private readonly viewer: MovementPriceAdapterContractViewer,
    private readonly writer?: MovementPriceAdapterContractWriter
  ) {}

  //eslint-disable-next-line @typescript-eslint/require-await
  async getPricesFromPayload(
    _paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string> {
    if (!this.writer) {
      throw new Error("Adapter not set up for writes");
    }

    const unsignedMetadataArgs = {
      withUnsignedMetadata: true,
      metadataTimestamp: Date.now(),
    };

    const { payloads } = ContractParamsProvider.extractMissingValues(
      await paramsProvider.prepareSplitPayloads(unsignedMetadataArgs),
      this.logger
    );

    return await this.writer.writePrices(payloads, (feedId) =>
      ContractParamsProvider.copyForFeedId(
        paramsProvider,
        feedId
      ).getPayloadHex(true, unsignedMetadataArgs)
    );
  }

  async getUniqueSignerThreshold(): Promise<number> {
    return await this.viewer.viewUniqueSignerThreshold();
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    const contractData = await this.readContractData(
      paramsProvider.getDataFeedIds()
    );

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => contractData[feedId].lastValue);
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
