import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import {
  ParallelTransactionExecutor,
  Transaction,
} from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";
import { SuiConfig } from "./config";

const MAX_PARALLEL_TRANSACTION_COUNT = 5;
const SPLIT_COIN_INITIAL_BALANCE = DEFAULT_GAS_BUDGET;

export class SuiTxDeliveryMan {
  protected readonly logger = loggerFactory("sui-tx-delivery-man");

  constructor(
    public client: SuiClient,
    public keypair: Keypair,
    private config: SuiConfig,
    private executor?: ParallelTransactionExecutor
  ) {}

  async sendTransaction(
    tx: Transaction,
    repeatedTransactionCreator: (
      iterationIndex: number
    ) => Promise<Transaction>,
    iterationIndex = 0
  ): Promise<string> {
    try {
      (iterationIndex ? this.logger.info : this.logger.debug)(
        `Iteration #${iterationIndex} started`
      );

      return await RedstoneCommon.timeout(
        this.performExecutingTx(tx),
        this.config.expectedTxDeliveryTimeInMs
      );
    } catch (e) {
      const nextIterationIndex = iterationIndex + 1;
      this.logger.error(
        `Iteration #${iterationIndex} FAILED: ${RedstoneCommon.stringifyError(e)}`
      );

      if (nextIterationIndex >= this.config.maxTxSendAttempts) {
        throw e;
      }

      const tx = await repeatedTransactionCreator(nextIterationIndex);
      return await this.sendTransaction(
        tx,
        repeatedTransactionCreator,
        nextIterationIndex
      );
    }
  }

  private async performExecutingTx(tx: Transaction) {
    const date = Date.now();
    const { digest, data } = await this.executeTxWithExecutor(
      tx,
      this.getExecutor()
    );

    const { status, success, error } = SuiTxDeliveryMan.getStatus(data);
    const cost = SuiTxDeliveryMan.getCost(data);
    this.logger.log(
      `Transaction ${digest} finished in ${Date.now() - date} [ms], status: ${status.toUpperCase()}, cost: ${cost} SUI`,
      {
        errors: data.errors,
        gasUsed: data.effects!.gasUsed,
        gasData: data.transaction!.data.gasData,
      }
    );

    if (!success) {
      throw new Error(error);
    }

    return digest;
  }

  private async executeTxWithExecutor(
    tx: Transaction,
    executor: ParallelTransactionExecutor
  ) {
    try {
      return await executor.executeTransaction(tx, {
        showEffects: true,
        showBalanceChanges: true,
        showInput: true,
      });
    } catch (e) {
      this.logger.warn("Reinitializing gas objects...");
      this.initializeExecutor();
      throw e;
    }
  }

  private getExecutor() {
    return this.executor ?? this.initializeExecutor();
  }

  private initializeExecutor() {
    const executor = new ParallelTransactionExecutor({
      client: this.client,
      signer: this.keypair,
      initialCoinBalance: SPLIT_COIN_INITIAL_BALANCE,
      maxPoolSize: MAX_PARALLEL_TRANSACTION_COUNT,
    });

    this.executor = executor;

    return executor;
  }

  static getStatus(response: SuiTransactionBlockResponse) {
    const status = response.effects!.status.status;
    const error = response.effects?.status.error;
    const success = status === "success";

    return { status, success, error };
  }

  private static getCost(response: SuiTransactionBlockResponse) {
    return (
      Number(BigInt(response.balanceChanges![0].amount.replace("-", ""))) /
      Number(MIST_PER_SUI)
    );
  }
}
