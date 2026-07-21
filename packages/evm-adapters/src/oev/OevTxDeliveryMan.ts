import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { EvmTxDeliveryManContext } from "../EvmTxDeliveryManContext";
import { RedstoneEvmContract } from "../facade/evm/RedstoneEvmContract";
import { OevConfig } from "./oev-config";
import { updateUsingOevAuction } from "./update-using-oev-auction";

export class OevTxDeliveryMan implements Tx.ITxDeliveryMan<EvmTxDeliveryManContext> {
  private readonly logger = loggerFactory("updatePrices/oev");

  constructor(
    private readonly fallbackDeliveryMan: Tx.ITxDeliveryMan,
    private readonly adapterContract: RedstoneEvmContract,
    private readonly config: OevConfig
  ) {}

  async deliver(txDeliveryCall: Tx.TxDeliveryCall, context: EvmTxDeliveryManContext) {
    try {
      await this.updateUsingOevAuction(txDeliveryCall);
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

  private async updateUsingOevAuction(txDeliveryCall: Tx.TxDeliveryCall) {
    const updateUsingOevAuctionPromise = updateUsingOevAuction(
      this.config,
      txDeliveryCall.data,
      this.adapterContract
    );
    const timeout = this.config.oevTotalTimeout;

    await RedstoneCommon.timeout(
      updateUsingOevAuctionPromise,
      timeout,
      `Updating using OEV auction didn't succeed in ${timeout} [ms].`
    );
  }
}
