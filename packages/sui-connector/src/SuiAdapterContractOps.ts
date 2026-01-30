import { bcs } from "@mysten/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { SuiConfig } from "./config";
import { PriceAdapterConfig } from "./PriceAdapterConfig";
import { serialize, serializeAddresses, serializeSigners } from "./util";

export class SuiAdapterContractOps {
  static initialize(
    tx: Transaction,
    config: PriceAdapterConfig,
    packageId: string,
    adminCap: string
  ) {
    tx.setGasBudget(config.initializeTxGasBudget);
    tx.moveCall({
      target: `${packageId}::main::initialize_price_adapter`,
      arguments: [tx.object(adminCap), ...this.makeConfigArgs(config).map(tx.pure)],
    });
  }

  static updateConfig(tx: Transaction, config: SuiConfig & PriceAdapterConfig, adminCap: string) {
    tx.setGasBudget(config.initializeTxGasBudget);
    tx.moveCall({
      target: `${config.packageId}::price_adapter::update_config`,
      arguments: [
        tx.object(adminCap),
        tx.object(config.priceAdapterObjectId),
        ...this.makeConfigArgs(config, true).map(tx.pure),
      ],
    });
  }

  private static makeConfigArgs(config: PriceAdapterConfig, asOptional = false) {
    return [
      serializeSigners(config.signers, asOptional),
      serialize(bcs.u8(), config.signerCountThreshold, asOptional),
      serialize(bcs.u64(), config.maxTimestampDelayMs, asOptional),
      serialize(bcs.u64(), config.maxTimestampAheadMs, asOptional),
      serializeAddresses(config.trustedUpdaters, asOptional),
      serialize(bcs.u64(), config.minIntervalBetweenUpdatesMs, asOptional),
    ];
  }
}
