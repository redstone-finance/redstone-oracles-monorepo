import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { loggerFactory } from "@redstone-finance/utils";
import Decimal from "decimal.js";
import { SuiClient } from "./SuiClient";

export const DEFAULT_GAS_BUDGET = MIST_PER_SUI / 10n; // 0.1 SUI

export class SuiContractUtil {
  protected static readonly logger = loggerFactory("sui-contract-util");

  static async prepareBaseTransaction(
    client: SuiClient,
    gasMultiplier: number,
    keypair: Keypair,
    gasBudget?: bigint
  ) {
    const gasPrice = await this.computeGasPrice(client, gasMultiplier);
    const maxGasBudget = gasBudget ?? DEFAULT_GAS_BUDGET;

    const tx = new Transaction();
    tx.setGasPrice(gasPrice);
    tx.setGasBudget(maxGasBudget);
    tx.setSender(keypair.toSuiAddress());

    return tx;
  }

  private static async computeGasPrice(client: SuiClient, gasMultiplier: number = 1) {
    const date = Date.now();

    const gasPrice = await client.getReferenceGasPrice();

    this.logger.info(`Reference gas price: ${gasPrice} MIST fetched in ${Date.now() - date} [ms]`);

    return BigInt(new Decimal(gasPrice.toString()).times(gasMultiplier).floor().toString());
  }
}
