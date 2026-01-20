import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
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
    const { feedsFromResponse, missingFeeds, dataPackages, requestedFeedIds } =
      await paramsProvider.requestDataPackagesWithFeedsInfo();

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

    const dataFeedsAsBytes32 = feedsFromResponse.map(utils.formatBytes32String);
    const dataPackagesWrapper = new DataPackagesWrapper<MultiFeedAdapterWithoutRounds>(
      dataPackages
    );

    dataPackagesWrapper.setMetadataTimestamp(metadataTimestamp);
    const wrappedContract = dataPackagesWrapper.overwriteEthersContract(this.adapterContract);

    const txCall = Tx.convertToTxDeliveryCall(
      await wrappedContract.populateTransaction["updateDataFeedsValuesPartial"](dataFeedsAsBytes32)
    );

    return txCall;
  }

  protected override getBaseIterationTxParamsProvider(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): ContractParamsProvider {
    return options && this.shouldUpdateAllFeedsInBaseIteration
      ? paramsProvider.copyForFeedIds(options.allFeedIds)
      : super.getBaseIterationTxParamsProvider(paramsProvider, options);
  }
}
