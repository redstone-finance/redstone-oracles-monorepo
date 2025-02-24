import {
  ContractData,
  type ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import { IMovementContractAdapter } from "./types";

export class MovementPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  private readonly logger = loggerFactory("movement-contract-adapter");

  constructor(private readonly adapter: IMovementContractAdapter) {}

  //eslint-disable-next-line @typescript-eslint/require-await
  async getPricesFromPayload(
    _paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string> {
    if (!this.adapter.writer) {
      throw new Error("Adapter not set up for writes");
    }

    const payloads: { feedId: string; payload: string }[] = [];
    await paramsProvider.prepareContractCallPayloads({
      onFeedPayload: (feedId, payload) => {
        payloads.push({ feedId, payload });
        return Promise.resolve();
      },
      onFeedMissing: (feedId) =>
        this.logger.warn(`No data packages found for "${feedId}"`),
    });

    return await this.adapter.writer.writePrices(payloads);
  }

  async getUniqueSignerThreshold(): Promise<number> {
    return await this.adapter.viewer.viewUniqueSignerThreshold();
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
    return await this.adapter.viewer.viewContractData(feedIds);
  }

  private async readAnyRoundDetails(feedId: string) {
    return Object.values(await this.readContractData([feedId]))[0];
  }
}
