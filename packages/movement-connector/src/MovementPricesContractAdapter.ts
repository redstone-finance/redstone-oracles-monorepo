import { MoveVector } from "@aptos-labs/ts-sdk";
import { hexlify } from "@ethersproject/bytes";
import {
  ContractData,
  type ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumberish } from "ethers";
import { IMovementContractAdapter } from "./types";
import { feedIdHexToMoveVector, makeFeedIdBytes } from "./utils";

export const SEED = "RedstonePriceAdapter";

export class MovementPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
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
    const feedIdsHex = paramsProvider.getDataFeedIds().map((feedId) => {
      return hexlify(makeFeedIdBytes(feedId));
    });

    const payload = await paramsProvider.getPayloadHex();

    return await this.adapter.writer.writePrices(
      new MoveVector(feedIdsHex.map(feedIdHexToMoveVector)),
      MoveVector.U8(payload)
    );
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
