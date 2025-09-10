import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { utils } from "ethers";
import { MultiFeedAdapterWithoutRounds } from "../../../typechain-types";
import { RelayerConfig } from "../../config/RelayerConfig";
import { updateUsingOevAuction } from "../../custom-integrations/fastlane/update-using-oev-auction";
import { RelayerTxDeliveryManContext } from "./RelayerTxDeliveryManContext";

export class OevMultiAuctionsTxDeliveryMan implements Tx.ITxDeliveryMan {
  private readonly logger = loggerFactory("updatePrices/oev");

  constructor(
    private readonly fallbackDeliveryMan: Tx.ITxDeliveryMan,
    private readonly adapterContract: MultiFeedAdapterWithoutRounds,
    private readonly relayerConfig: RelayerConfig
  ) {}

  async deliver(txDeliveryCall: Tx.TxDeliveryCall, context: RelayerTxDeliveryManContext) {
    try {
      await this.updateUsingOevAuctions(context.paramsProvider);
      this.logger.log("Update using oev auction has finished. Proceeding with a standard update");
      if (context.deferredCallData) {
        txDeliveryCall.data = await context.deferredCallData();
      }
      await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
      this.logger.log("Standard update has finished");
    } catch (e) {
      this.logger.error(`Failed to update using oev auction: ${RedstoneCommon.stringifyError(e)}`);
      if (context.canOmitFallbackAfterFailing) {
        this.logger.log("Skipping as update was optional");
      } else {
        this.logger.warn(`Failed to update using OEV auction, proceeding with standard update`);
        if (context.deferredCallData) {
          txDeliveryCall.data = await context.deferredCallData();
        }
        await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
      }
    }
  }

  private async updateUsingOevAuctions(paramsProvider: ContractParamsProvider) {
    const auctionPromises = [];

    const metadataTimestamp = Date.now();
    for (const feedId of paramsProvider.getDataFeedIds()) {
      this.logger.log("Oev Auction for FeedId", feedId);
      const singleFeedParamProvider = paramsProvider.copyForFeedId(feedId);

      const updateUsingOevAuctionPromise = this.makeSingleFeedUpdateTx(
        singleFeedParamProvider,
        metadataTimestamp
      ).then((tx) => updateUsingOevAuction(this.relayerConfig, tx.data, this.adapterContract));

      auctionPromises.push(updateUsingOevAuctionPromise);
    }

    const timeout = this.relayerConfig.oevTotalTimeout;

    await RedstoneCommon.timeout(
      Promise.all(auctionPromises),
      timeout,
      `Updating using OEV auction didn't succeed in ${timeout} [ms].`
    );
  }

  async makeSingleFeedUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall> {
    const dataFeedsAsBytes32 = paramsProvider.getDataFeedIds().map(utils.formatBytes32String);
    const dataPackages = await paramsProvider.requestDataPackages();
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
}
