import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import {
  ContractParamsProvider,
  getDataPackagesTimestamp,
  ValuesForDataFeeds,
} from "@redstone-finance/sdk";
import { RedstoneCommon, Tx } from "@redstone-finance/utils";
import { BigNumber, utils } from "ethers";
import { RedstoneAdapterBase } from "../../../typechain-types";
import { ContractData } from "../../types";
import { EvmContractAdapter } from "./EvmContractAdapter";
import { getLatestTimestampsFromContract } from "./get-latest-timestamps-from-contract";

export class PriceFeedsEvmContractAdapter<
  Contract extends RedstoneAdapterBase,
> extends EvmContractAdapter<Contract> {
  override async makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall> {
    const dataPackages = await paramsProvider.requestDataPackages();
    const dataPackagesWrapper = new DataPackagesWrapper<RedstoneAdapterBase>(
      dataPackages
    );
    const proposedTimestamp = getDataPackagesTimestamp(dataPackages);

    dataPackagesWrapper.setMetadataTimestamp(metadataTimestamp);
    const wrappedContract = dataPackagesWrapper.overwriteEthersContract(
      this.adapterContract
    );

    const txCall = Tx.convertToTxDeliveryCall(
      await wrappedContract.populateTransaction["updateDataFeedsValues"](
        proposedTimestamp
      )
    );

    return txCall;
  }

  override readLatestRoundParamsFromContract(
    feedIds: string[],
    blockNumber: number
  ): Promise<ContractData> {
    const { updateConditions } = this.relayerConfig;
    const shouldCheckValueDeviation = feedIds.some((feedId) =>
      updateConditions[feedId].includes("value-deviation")
    );

    return this.getLastRoundParamsFromContract(
      blockNumber,
      feedIds,
      shouldCheckValueDeviation
    );
  }

  async getValuesForDataFeeds(dataFeeds: string[], blockTag: number) {
    const dataFeedsAsBytes32 = dataFeeds.map(utils.formatBytes32String);
    const valuesFromContractAsBigNumber =
      await this.adapterContract.getValuesForDataFeeds(dataFeedsAsBytes32, {
        blockTag,
      });
    const dataFeedsValues: ValuesForDataFeeds = {};
    for (const [index, dataFeedId] of dataFeeds.entries()) {
      const currentValue = valuesFromContractAsBigNumber[index];

      dataFeedsValues[dataFeedId] = currentValue;
    }
    return dataFeedsValues;
  }

  private async getLastRoundParamsFromContract(
    blockTag: number,
    dataFeeds: string[],
    shouldCheckValueDeviation: boolean
  ): Promise<ContractData> {
    // We fetch the latest values from contract only if we want to check value deviation
    const { lastUpdateTimestamps, valuesFromContract } =
      await RedstoneCommon.waitForAllRecord({
        lastUpdateTimestamps: getLatestTimestampsFromContract(
          this.adapterContract,
          blockTag
        ),
        valuesFromContract: shouldCheckValueDeviation
          ? this.getValuesForDataFeeds(dataFeeds, blockTag)
          : Promise.resolve({} as ValuesForDataFeeds),
      });
    const { lastBlockTimestampMS, lastDataPackageTimestampMS } =
      lastUpdateTimestamps;
    const lastRoundParams: ContractData = {};
    for (const dataFeedId of dataFeeds) {
      lastRoundParams[dataFeedId] = {
        lastBlockTimestampMS,
        lastDataPackageTimestampMS,
        lastValue: valuesFromContract[dataFeedId] ?? BigNumber.from(0),
      };
    }
    return lastRoundParams;
  }
}
