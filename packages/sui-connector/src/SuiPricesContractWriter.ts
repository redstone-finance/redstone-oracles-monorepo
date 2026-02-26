import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { utils } from "ethers";
import { SuiClient } from "./SuiClient";
import { SuiContractUtil } from "./SuiContractUtil";
import { SuiConfig } from "./config";
import { makeFeedIdBytes, uint8ArrayToBcs } from "./util";

export class SuiPricesContractWriter {
  protected readonly logger = loggerFactory("sui-prices-writer");

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    private readonly config: SuiConfig
  ) {}

  getSignerAddress() {
    return this.keypair.toSuiAddress();
  }

  async prepareWritePricesTransaction(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number,
    iterationIndex = 0
  ) {
    const tx = await SuiContractUtil.prepareBaseTransaction(
      this.client,
      this.config.gasMultiplier ** iterationIndex,
      this.keypair,
      this.config.writePricesTxGasBudget
    );

    const unsignedMetadataArgs = {
      withUnsignedMetadata: true,
      metadataTimestamp,
    };

    const { payloads } = ContractParamsProvider.extractMissingValues(
      await paramsProvider.prepareSplitPayloads(unsignedMetadataArgs),
      this.logger
    );

    for (const [feedId, payload] of Object.entries(payloads)) {
      this.writePrice(tx, feedId, payload);
    }

    return tx;
  }

  private writePrice(tx: Transaction, feedId: string, payload: string) {
    tx.moveCall({
      target: `${this.config.packageId}::price_adapter::try_write_price`,
      arguments: [
        tx.object(this.config.priceAdapterObjectId),
        tx.pure(uint8ArrayToBcs(makeFeedIdBytes(feedId))),
        tx.pure(uint8ArrayToBcs(utils.arrayify("0x" + payload))),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }
}
