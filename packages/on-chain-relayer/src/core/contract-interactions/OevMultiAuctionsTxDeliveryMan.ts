import { MultiFeedAdapterWithoutRounds } from "@redstone-finance/evm-adapters";
import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { ContractParamsProvider, DataPackagesResponse } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { utils } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";
import { updateUsingOevAuction } from "../../custom-integrations/fastlane/update-using-oev-auction";
import { RelayerTxDeliveryManContext } from "../RelayerTxDeliveryManContext";

export class OevMultiAuctionsTxDeliveryMan
  implements Tx.ITxDeliveryMan<RelayerTxDeliveryManContext>
{
  private readonly logger = loggerFactory("updatePrices/oev");

  constructor(
    private readonly fallbackDeliveryMan: Tx.ITxDeliveryMan,
    private readonly adapterContract: MultiFeedAdapterWithoutRounds,
    private readonly relayerConfig: RelayerConfig
  ) {}

  async deliver(txDeliveryCall: Tx.TxDeliveryCall, context: RelayerTxDeliveryManContext) {
    try {
      const start = Date.now();
      this.logger.info(`OEV Auctions start`);

      const { values, errors } = await this.updateUsingOevAuctions(context.paramsProvider);
      const auctionsTime = Date.now() - start;
      this.logger.info(
        `OEV Auctions finished in ${auctionsTime}ms with ${values.length} successes and ${errors.length} errors`
      );

      if (values.length > 0) {
        this.logger.info(`OEV Auctions succeeded, proceeding with a standard update`, values);
        if (context.deferredCallData) {
          txDeliveryCall.data = await context.deferredCallData();
        }
        await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
        this.logger.info("Standard update has finished");
      } else {
        await this.onOevAuctionsFailureCallback(txDeliveryCall, context);
      }
    } catch (e) {
      this.logger.error(
        `OEV Auctions failed to update due to: ${RedstoneCommon.stringifyError(e)}`
      );
      await this.onOevAuctionsFailureCallback(txDeliveryCall, context);
    }
  }

  private async onOevAuctionsFailureCallback(
    txDeliveryCall: Tx.TxDeliveryCall,
    context: RelayerTxDeliveryManContext
  ) {
    if (context.canOmitFallbackAfterFailing) {
      this.logger.info("OEV Auctions, skipping fallback as update was optional");
    } else {
      this.logger.warn(`OEV Auctions failed, proceeding with standard update`);
      if (context.deferredCallData) {
        txDeliveryCall.data = await context.deferredCallData();
      }
      await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
    }
  }

  private async updateUsingOevAuctions(paramsProvider: ContractParamsProvider) {
    const auctionPromises = [];

    const metadataTimestamp = Date.now();
    const dataPackages = await paramsProvider.requestDataPackages();
    for (const [feedId, packages] of Object.entries(dataPackages)) {
      const values = packages
        ?.flatMap((p) => p.dataPackage.dataPoints)
        .map((dp) => dp.toObj().value);

      this.logger.info(`OEV Auction ${feedId} update, values`, values);

      const updateUsingOevAuctionPromise = this.makeSingleFeedUpdateTx(
        feedId,
        dataPackages,
        metadataTimestamp
      ).then((tx) =>
        updateUsingOevAuction(this.relayerConfig, tx.data, this.adapterContract, feedId)
      );
      auctionPromises.push(updateUsingOevAuctionPromise);
    }

    const timeout = this.relayerConfig.oevTotalTimeout;

    const results = await RedstoneCommon.timeout(
      Promise.allSettled(auctionPromises),
      timeout,
      `OEV Auctions update didn't finish in ${timeout} [ms].`
    );

    const values = [];
    const errors = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        values.push(result.value);
      } else {
        const strigifiedError = RedstoneCommon.stringifyError(result.reason);
        this.logger.error(`OEV Auction error ${strigifiedError}`);
        errors.push(strigifiedError);
      }
    }

    return { values, errors };
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
