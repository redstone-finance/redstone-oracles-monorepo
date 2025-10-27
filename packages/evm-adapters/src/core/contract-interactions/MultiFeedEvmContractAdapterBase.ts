import { ContractData, LastRoundDetails } from "@redstone-finance/sdk";
import { utils } from "ethers";
import { MultiFeedAdapterWithoutRounds } from "../../../typechain-types";
import { EvmContractAdapter } from "./EvmContractAdapter";

export abstract class MultiFeedEvmContractAdapterBase<
  Contract extends MultiFeedAdapterWithoutRounds,
> extends EvmContractAdapter<Contract> {
  override async readLatestRoundContractData(
    feedIds: string[],
    blockNumber: number
  ): Promise<ContractData> {
    const dataFromContract: ContractData = {};

    const lastRoundDetails = await this.getLastUpdateDetailsForManyFromContract(
      feedIds,
      blockNumber
    );

    for (const [index, dataFeedId] of feedIds.entries()) {
      dataFromContract[dataFeedId] = lastRoundDetails[index];
    }

    return dataFromContract;
  }

  private async getLastUpdateDetailsForManyFromContract(
    feedIds: string[],
    blockNumber: number
  ): Promise<LastRoundDetails[]> {
    const dataFeedsAsBytes32 = feedIds.map(utils.formatBytes32String);
    const contractOutput: MultiFeedAdapterWithoutRounds.LastUpdateDetailsStructOutput[] =
      await this.adapterContract.getLastUpdateDetailsUnsafeForMany(dataFeedsAsBytes32, {
        blockTag: blockNumber,
      });

    return contractOutput.map((lastRoundDetails) => ({
      lastDataPackageTimestampMS: lastRoundDetails.dataTimestamp.toNumber(),
      lastBlockTimestampMS: lastRoundDetails.blockTimestamp.toNumber() * 1000,
      lastValue: lastRoundDetails.value.toBigInt(),
    }));
  }
}
