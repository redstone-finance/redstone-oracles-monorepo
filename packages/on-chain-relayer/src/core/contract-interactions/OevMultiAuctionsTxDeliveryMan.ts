import {
  MultiFeedAdapterWithoutRounds,
  RelayerTxDeliveryManContext,
} from "@redstone-finance/evm-adapters";
import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { ContractParamsProvider, DataPackagesResponse } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { utils } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";
import { updateUsingOevAuction } from "../../custom-integrations/fastlane/update-using-oev-auction";

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
    const dataPackages = await paramsProvider.requestDataPackages();
    const dataPackagesFeeds = Object.keys(dataPackages);
    for (const feedId of dataPackagesFeeds) {
      this.logger.log("Oev Auction for FeedId", feedId);

      const updateUsingOevAuctionPromise = this.makeSingleFeedUpdateTx(
        feedId,
        dataPackages,
        metadataTimestamp
      ).then((tx) => updateUsingOevAuction(this.relayerConfig, tx.data, this.adapterContract));

      auctionPromises.push(updateUsingOevAuctionPromise);
    }

    const timeout = this.relayerConfig.oevTotalTimeout;

    await RedstoneCommon.timeout(
      Promise.allSettled(auctionPromises),
      timeout,
      `Updating using OEV auctions didn't succeed in ${timeout} [ms].`
    );
  }

  async makeSingleFeedUpdateTx(
    feedId: string,
    dataPackages: DataPackagesResponse,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall> {
    const feedAsBytes32 = utils.formatBytes32String(feedId);
    const dataPackagesWrapper = new DataPackagesWrapper<MultiFeedAdapterWithoutRounds>({
      feedId: dataPackages[feedId],
    });
    dataPackagesWrapper.setMetadataTimestamp(metadataTimestamp);
    const wrappedContract = dataPackagesWrapper.overwriteEthersContract(this.adapterContract);

    const txCall = Tx.convertToTxDeliveryCall(
      await wrappedContract.populateTransaction["updateDataFeedsValuesPartial"]([feedAsBytes32])
    );

    return txCall;
  }
}
