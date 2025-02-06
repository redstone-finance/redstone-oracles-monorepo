import { SuiClient } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { loggerFactory } from "@redstone-finance/utils";
import Decimal from "decimal.js";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";

export const DEFAULT_GAS_BUDGET = MIST_PER_SUI / 10n; // 0.1 SUI

export class SuiContractAdapter {
  protected readonly logger = loggerFactory("sui-contract-adapter");

  constructor(
    protected readonly client: SuiClient,
    protected keypair?: Keypair,
    protected deliveryMan?: SuiTxDeliveryMan
  ) {}

  protected async computeGasPrice(gasMultiplier: number = 1) {
    const date = Date.now();
    const gasPrice = await this.client.getReferenceGasPrice();
    this.logger.info(
      `Reference gas price: ${gasPrice} MIST fetched in ${Date.now() - date} [ms]`
    );

    return BigInt(
      new Decimal(gasPrice.toString()).times(gasMultiplier).floor().toString()
    );
  }

  protected async prepareBaseTransaction(
    gasMultiplier: number,
    gasBudget?: bigint,
    keypair = this.keypair
  ) {
    if (!keypair) {
      throw new Error("A keypair is needed to write prices to contract");
    }

    const gasPrice = await this.computeGasPrice(gasMultiplier);
    const maxGasBudget = gasBudget ?? DEFAULT_GAS_BUDGET;

    const tx = new Transaction();
    tx.setGasPrice(gasPrice);
    tx.setGasBudget(maxGasBudget);
    tx.setSender(keypair.toSuiAddress());

    return tx;
  }
}
