import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { utils } from "ethers";
import { SuiContractUtil } from "./SuiContractUtil";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";
import { SuiConfig } from "./config";
import { makeFeedIdBytes, uint8ArrayToBcs } from "./util";

export class SuiPricesContractWriter {
  protected readonly logger = loggerFactory("sui-prices-writer");

  constructor(
    private readonly deliveryMan: SuiTxDeliveryMan,
    private readonly config: SuiConfig
  ) {}

  getSignerAddress() {
    return this.deliveryMan.keypair.toSuiAddress();
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    const metadataTimestamp = Date.now();
    const tx = await this.prepareWritePricesTransaction(paramsProvider, metadataTimestamp);

    return await this.deliveryMan.sendTransaction(
      tx,
      async (iterationIndex) =>
        await this.prepareWritePricesTransaction(paramsProvider, metadataTimestamp, iterationIndex)
    );
  }

  private async prepareWritePricesTransaction(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number,
    iterationIndex = 0
  ) {
    const tx = await SuiContractUtil.prepareBaseTransaction(
      this.deliveryMan.client,
      this.config.gasMultiplier ** iterationIndex,
      this.config.writePricesTxGasBudget,
      this.deliveryMan.keypair
    );

    const unsignedMetadataArgs = {
      withUnsignedMetadata: true,
      metadataTimestamp,
    };

    const { payloads } = ContractParamsProvider.extractMissingValues(
      await paramsProvider.prepareSplitPayloads(unsignedMetadataArgs),
      this.logger
    );

    Object.entries(payloads).forEach(([feedId, payload]) => {
      this.writePrice(tx, feedId, payload);
    });

    return tx;
  }

  private writePrice(tx: Transaction, feedId: string, payload: string) {
    tx.moveCall({
      target: `${this.config.packageId}::price_adapter::try_write_price`,
      arguments: [
        tx.object(this.config.priceAdapterObjectId),
        tx.pure(uint8ArrayToBcs(makeFeedIdBytes(feedId))),
        tx.pure(uint8ArrayToBcs(utils.arrayify("0x" + payload))),
        tx.object(SUI_CLOCK_OBJECT_ID), // Clock object ID
      ],
    });
  }
}
