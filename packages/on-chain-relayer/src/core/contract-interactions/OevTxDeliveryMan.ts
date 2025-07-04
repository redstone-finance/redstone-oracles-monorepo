import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";
import { updateUsingOevAuction } from "../../custom-integrations/fastlane/update-using-oev-auction";
import { RedstoneEvmContract } from "../../facade/evm/EvmContractFacade";
import { RelayerTxDeliveryManContext } from "./RelayerTxDeliveryManContext";

export class OevTxDeliveryMan implements Tx.ITxDeliveryMan {
  private readonly logger = loggerFactory("updatePrices/oev");

  constructor(
    private readonly fallbackDeliveryMan: Tx.ITxDeliveryMan,
    private readonly adapterContract: RedstoneEvmContract,
    private readonly relayerConfig: RelayerConfig
  ) {}

  async deliver(
    txDeliveryCall: Tx.TxDeliveryCall,
    context: RelayerTxDeliveryManContext
  ) {
    try {
      await this.updateUsingOevAuction(txDeliveryCall);
      this.logger.log(
        "Update using oev auction has finished. Proceeding with a standard update"
      );
      if (context.deferredCallData) {
        txDeliveryCall.data = await context.deferredCallData();
      }
      await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
      this.logger.log("Standard update has finished");
    } catch (e) {
      this.logger.error(
        `Failed to update using oev auction: ${RedstoneCommon.stringifyError(e)}`
      );
      if (context.canOmitFallbackAfterFailing) {
        this.logger.log("Skipping as update was optional");
      } else {
        this.logger.warn(
          `Failed to update using OEV auction, proceeding with standard update`
        );
        if (context.deferredCallData) {
          txDeliveryCall.data = await context.deferredCallData();
        }
        await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
      }
    }
  }

  private async updateUsingOevAuction(txDeliveryCall: Tx.TxDeliveryCall) {
    const updateUsingOevAuctionPromise = updateUsingOevAuction(
      this.relayerConfig,
      txDeliveryCall.data,
      this.adapterContract
    );
    const timeout = this.relayerConfig.oevTotalTimeout;

    await RedstoneCommon.timeout(
      updateUsingOevAuctionPromise,
      timeout,
      `Updating using OEV auction didn't succeed in ${timeout} [ms].`
    );
  }
}
