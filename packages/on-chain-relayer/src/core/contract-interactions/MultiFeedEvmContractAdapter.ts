import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, Tx } from "@redstone-finance/utils";
import { utils } from "ethers";
import _ from "lodash";
import { MultiFeedAdapterWithoutRounds } from "../../../typechain-types";
import { UpdatePricesOptions } from "../../facade/ContractFacade";
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
    const dataFeedsToUpdate = paramsProvider.getDataFeedIds();
    let dataFeedsAsBytes32 = dataFeedsToUpdate.map(utils.formatBytes32String);
    const dataPackages = await paramsProvider.requestDataPackages();
    const dataPackagesFeeds = Object.keys(dataPackages);
    const diff = _.difference(dataFeedsToUpdate, dataPackagesFeeds);

    //TODO: Multifeed won't work with medium data packages.
    if (diff.length) {
      logger.log(
        `Missing some feeds in the response: [${diff.toString()}], will update only for [${dataPackagesFeeds.toString()}]`,
        {
          dataFeedsToUpdate,
          dataPackagesFeeds,
        }
      );

      dataFeedsAsBytes32 = dataPackagesFeeds.map(utils.formatBytes32String);
    } else {
      logger.info(
        `All feeds available in the response, will update for [${dataPackagesFeeds.toString()}]`,
        {
          dataFeedsToUpdate,
          dataPackagesFeeds,
        }
      );
    }

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
