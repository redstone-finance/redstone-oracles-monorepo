import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import {
  ContractParamsProvider,
  DataPackagesResponse,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { loggerFactory, Tx } from "@redstone-finance/utils";
import { utils } from "ethers";
import { MultiFeedAdapterWithoutRounds } from "../../../typechain-types";
import { MultiFeedEvmContractAdapterBase } from "./MultiFeedEvmContractAdapterBase";

const logger = loggerFactory("updatePrices/multi-feed");

export class MultiFeedEvmContractAdapter extends MultiFeedEvmContractAdapterBase<MultiFeedAdapterWithoutRounds> {
  constructor(
    adapterContract: MultiFeedAdapterWithoutRounds,
    txDeliveryMan: Tx.ITxDeliveryMan,
    private shouldUpdateAllFeedsInBaseIteration?: boolean
  ) {
    super(adapterContract, txDeliveryMan);
  }

  async makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall> {
    const { dataPackages, feedsFromResponse, missingFeeds, requestedFeedIds } =
      await paramsProvider.requestDataPackagesWithFeedsInfo();
    MultiFeedEvmContractAdapter.logResponseFeeds(missingFeeds, feedsFromResponse, requestedFeedIds);

    return await MultiFeedEvmContractAdapter.makeUpdateTxWithDataPackages(
      this.adapterContract,
      dataPackages,
      feedsFromResponse,
      metadataTimestamp
    );
  }

  static async makeUpdateTxWithDataPackages(
    contract: MultiFeedAdapterWithoutRounds,
    dataPackages: DataPackagesResponse,
    feedIds: string[],
    metadataTimestamp?: number
  ) {
    const dataPackagesWrapper = new DataPackagesWrapper<MultiFeedAdapterWithoutRounds>(
      dataPackages
    );
    if (metadataTimestamp) {
      dataPackagesWrapper.setMetadataTimestamp(metadataTimestamp);
    }
    const wrappedContract = dataPackagesWrapper.overwriteEthersContract(contract);

    return Tx.convertToTxDeliveryCall(
      await wrappedContract.populateTransaction["updateDataFeedsValuesPartial"](
        feedIds.map(utils.formatBytes32String)
      )
    );
  }

  protected override getBaseIterationTxParamsProvider(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): ContractParamsProvider {
    return options && this.shouldUpdateAllFeedsInBaseIteration
      ? paramsProvider.copyForFeedIds(options.allFeedIds)
      : super.getBaseIterationTxParamsProvider(paramsProvider, options);
  }

  private static logResponseFeeds(
    missingFeeds: string[],
    feedsFromResponse: string[],
    requestedFeedIds: string[]
  ) {
    if (missingFeeds.length) {
      logger.log(
        `Missing some feeds in the response: [${missingFeeds.toString()}], will update only for [${feedsFromResponse.toString()}]`,
        {
          missingFeeds,
          feedsFromResponse,
          requestedFeedIds,
        }
      );
    } else {
      logger.info(
        `All feeds available in the response, will update for [${feedsFromResponse.toString()}]`,
        {
          feedsFromResponse,
          requestedFeedIds,
        }
      );
    }
  }
}
