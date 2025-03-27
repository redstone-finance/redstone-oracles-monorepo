import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";
import { updateUsingOevAuction } from "../../custom-integrations/fastlane/update-using-oev-auction";
import { RedstoneEvmContract } from "../../facade/evm/EvmContractFacade";
import { RelayerTxDeliveryManContext } from "./RelayerTxDeliveryManContext";

export class OevTxDeliveryMan implements Tx.ITxDeliveryMan {
  private logger = loggerFactory("updatePrices/oev");

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
      await this.updateUsingOevAction(txDeliveryCall, context.paramsProvider);
    } catch (error) {
      if (context.paramsProvider.shouldOevUseFallbackAfterFailing === false) {
        this.logger.log("Skipping as update was optional");
      } else {
        this.logger.info(
          `Failed to update using OEV auction, proceeding with standard update`
        );

        await this.fallbackDeliveryMan.deliver(txDeliveryCall, context);
      }
    }
  }

  private async updateUsingOevAction(
    txDeliveryCall: Tx.TxDeliveryCall,
    paramsProvider: ContractParamsProvider | undefined
  ) {
    const updateUsingOevAuctionPromise = updateUsingOevAuction(
      this.relayerConfig,
      txDeliveryCall.data,
      await this.adapterContract.provider.getBlockNumber(),
      this.adapterContract,
      await paramsProvider!.requestDataPackages()
    );
    const timeout = this.relayerConfig.oevTotalTimeout;

    await RedstoneCommon.timeout(
      updateUsingOevAuctionPromise,
      timeout,
      `Updating using OEV auction didn't succeed in ${timeout} [ms].`
    );
  }
}
