import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import {
  ParallelTransactionExecutor,
  Transaction,
} from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { loggerFactory } from "@redstone-finance/utils";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";

const MAX_PARALLEL_TRANSACTION_COUNT = 5;
const SPLIT_COIN_INITIAL_BALANCE = DEFAULT_GAS_BUDGET;

export class SuiTxDeliveryMan {
  protected readonly logger = loggerFactory("sui-tx-delivery-man");

  constructor(
    public client: SuiClient,
    public keypair: Keypair,
    private executor?: ParallelTransactionExecutor
  ) {}

  async sendTransaction(
    tx: Transaction,
    repeatedTransactionCreator?: () => Promise<Transaction | undefined>
  ): Promise<string> {
    const date = Date.now();
    const { digest, data } = await this.getExecutor().executeTransaction(tx, {
      showEffects: true,
      showBalanceChanges: true,
      showInput: true,
    });

    const { status, success } = SuiTxDeliveryMan.getSuccess(data);
    const cost = SuiTxDeliveryMan.getCost(data);
    this.logger.log(
      `Transaction ${digest} finished in ${Date.now() - date} [ms], status: ${status.toUpperCase()}${success ? "" : ` (${data.effects!.status.error})`}, cost: ${cost} SUI`,
      {
        errors: data.errors,
        gasUsed: data.effects!.gasUsed,
        gasData: data.transaction!.data.gasData,
      }
    );

    if (!success && repeatedTransactionCreator) {
      const tx = await repeatedTransactionCreator();

      if (!tx) {
        return digest;
      }

      return await this.sendTransaction(tx, repeatedTransactionCreator);
    }

    return digest;
  }

  private getExecutor() {
    if (this.executor) {
      return this.executor;
    }

    this.executor = new ParallelTransactionExecutor({
      client: this.client,
      signer: this.keypair,
      initialCoinBalance: SPLIT_COIN_INITIAL_BALANCE,
      maxPoolSize: MAX_PARALLEL_TRANSACTION_COUNT,
    });

    return this.executor;
  }

  static getSuccess(response: SuiTransactionBlockResponse) {
    const status = response.effects!.status.status;
    const success = status === "success";

    return { status, success };
  }

  private static getCost(response: SuiTransactionBlockResponse) {
    return (
      Number(BigInt(response.balanceChanges![0].amount.replace("-", ""))) /
      Number(MIST_PER_SUI)
    );
  }
}
