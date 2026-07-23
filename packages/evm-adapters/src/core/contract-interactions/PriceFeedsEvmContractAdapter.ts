import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { ContractData, ContractParamsProvider, ValuesForDataFeeds } from "@redstone-finance/sdk";
import { RedstoneCommon, Tx } from "@redstone-finance/utils";
import { RedstoneAdapterBase } from "../../../typechain-types";
import { EvmContractAdapter } from "./EvmContractAdapter";
import { getLatestTimestampsFromContract } from "./get-latest-timestamps-from-contract";

export class PriceFeedsEvmContractAdapter<
  Contract extends RedstoneAdapterBase,
> extends EvmContractAdapter<Contract> {
  async getDataFeedIds(blockTag?: number) {
    return (await this.adapterContract.getDataFeedIds({ blockTag })).map(parseBytes32String);
  }

  override async makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall> {
    const { proposedTimestamp, wrappedContract } = await EvmContractAdapter.wrapContract(
      this.adapterContract,
      paramsProvider,
      metadataTimestamp
    );

    const txCall = Tx.convertToTxDeliveryCall(
      await wrappedContract.populateTransaction["updateDataFeedsValues"](proposedTimestamp)
    );

    return txCall;
  }

  override async readLatestRoundContractData(
    feedIds: string[],
    blockNumber?: number,
    withDataFeedValues = true
  ): Promise<ContractData> {
    const { lastUpdateTimestamps, valuesFromContract } = await RedstoneCommon.waitForAllRecord({
      lastUpdateTimestamps: getLatestTimestampsFromContract(this.adapterContract, blockNumber),
      valuesFromContract: withDataFeedValues
        ? this.getValuesForDataFeeds(feedIds, blockNumber)
        : Promise.resolve({} as ValuesForDataFeeds),
    });
    const { lastBlockTimestampMS, lastDataPackageTimestampMS } = lastUpdateTimestamps;
    const lastRoundParams: ContractData = {};
    for (const dataFeedId of feedIds) {
      lastRoundParams[dataFeedId] = {
        lastBlockTimestampMS,
        lastDataPackageTimestampMS,
        lastValue: valuesFromContract[dataFeedId] ?? 0n,
      };
    }

    return lastRoundParams;
  }

  async getValuesForDataFeeds(dataFeeds: string[], blockTag?: number) {
    const dataFeedsAsBytes32 = dataFeeds.map(formatBytes32String);
    const valuesFromContractAsBigNumber = await this.adapterContract.getValuesForDataFeeds(
      dataFeedsAsBytes32,
      {
        blockTag,
      }
    );
    const dataFeedsValues: ValuesForDataFeeds = {};
    for (const [index, dataFeedId] of dataFeeds.entries()) {
      dataFeedsValues[dataFeedId] = valuesFromContractAsBigNumber[index].toBigInt();
    }

    return dataFeedsValues;
  }
}
