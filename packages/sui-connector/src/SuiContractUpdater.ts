import type { Keypair } from "@mysten/sui/cryptography";
import { ParallelTransactionExecutor, Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { SuiConfig } from "./config";
import { SuiCoinProvider } from "./SuiCoinProvider";
import { SuiPricesContractWriter } from "./SuiPricesContractWriter";

const MAX_PARALLEL_TRANSACTION_COUNT = 5;
const SPLIT_COIN_INITIAL_BALANCE_MULTIPLIER = 2n;
const SPLIT_COIN_TX_COST = MIST_PER_SUI / 100n;

import type { SuiClientTypes } from "@mysten/sui/client";
import { SuiClient } from "./SuiClient";

type ExecutedTransaction = NonNullable<
  SuiClientTypes.TransactionResult<{ effects: true; events: true }>["Transaction"]
>;

export class SuiContractUpdater implements ContractUpdater {
  protected readonly logger = loggerFactory("sui-contract-updater");
  private readonly writer: SuiPricesContractWriter;
  private readonly coinProvider: SuiCoinProvider;

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    private readonly config: SuiConfig,
    private executor?: ParallelTransactionExecutor
  ) {
    this.writer = new SuiPricesContractWriter(client, keypair, config);
    this.coinProvider = new SuiCoinProvider(client);
  }

  async update(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext,
    attempt: number
  ): Promise<ContractUpdateStatus> {
    const txResult = await FP.tryCallAsyncStringifyError(() =>
      this.writer.prepareWritePricesTransaction(paramsProvider, context.updateStartTimeMs, attempt)
    );

    const digestResult = await FP.mapAsyncStringifyError(txResult, (tx) =>
      this.performExecutingTx(tx)
    );

    return FP.mapStringifyError(digestResult, (transactionHash) => ({ transactionHash }));
  }

  getSignerAddress() {
    return this.keypair.toSuiAddress();
  }

  getPrivateKey() {
    return this.keypair;
  }

  private async performExecutingTx(tx: Transaction) {
    const date = Date.now();
    const result = await this.executeTxWithExecutor(tx, await this.getExecutor());

    if (result.$kind === "FailedTransaction") {
      throw new Error(
        `Transaction failed, ${RedstoneCommon.stringifyError(result.FailedTransaction)}`
      );
    }
    const txData = result.Transaction;

    const checkEventsForFailure = true;
    const { status } = SuiContractUpdater.getStatus(txData, checkEventsForFailure);
    const cost = SuiContractUpdater.getCost(txData.effects);

    this.logger.log(
      `Transaction ${txData.digest} finished in ${Date.now() - date} [ms], status: ${status.toUpperCase()}, cost: ${cost} SUI`,
      {
        gasUsed: txData.effects.gasUsed,
        gasData: txData.effects.gasObject,
      }
    );

    return txData.digest;
  }

  private async executeTxWithExecutor(tx: Transaction, executor: ParallelTransactionExecutor) {
    try {
      return await executor.executeTransaction(tx, {
        effects: true,
        events: true,
      });
    } catch (e) {
      this.logger.warn("Reinitializing gas objects...");
      await this.initializeExecutor();
      throw e;
    }
  }

  private async getExecutor() {
    return this.executor ?? (await this.initializeExecutor());
  }

  private async initializeExecutor() {
    const initialCoinBalance =
      SPLIT_COIN_INITIAL_BALANCE_MULTIPLIER * this.config.writePricesTxGasBudget;
    const minimumBalance =
      initialCoinBalance * BigInt(MAX_PARALLEL_TRANSACTION_COUNT) + SPLIT_COIN_TX_COST;

    const sourceCoins = await this.coinProvider.getSourceCoins(minimumBalance, this.keypair);

    const executor = new ParallelTransactionExecutor({
      client: this.client.clientForParallelExecutor(),
      signer: this.keypair,
      initialCoinBalance,
      minimumCoinBalance: this.config.writePricesTxGasBudget,
      defaultGasBudget: this.config.writePricesTxGasBudget,
      maxPoolSize: MAX_PARALLEL_TRANSACTION_COUNT,
      coinBatchSize: MAX_PARALLEL_TRANSACTION_COUNT,
      sourceCoins,
    });

    this.executor = executor;

    return executor;
  }

  static getStatus(txData: ExecutedTransaction, checkEvents = false) {
    let status = txData.effects.status.success ? "success" : "failure";
    const error = txData.effects.status.error;
    let success = txData.effects.status.success;

    if (checkEvents) {
      const events = txData.events;

      const noUpdateError = events.every(
        (event) => !event.eventType.includes("price_adapter::UpdateError")
      );

      success = success && noUpdateError;
      status = success ? status : "failure";
    }

    return { status, success, error };
  }

  private static getCost(effects: ExecutedTransaction["effects"]) {
    const { gasUsed } = effects;
    const totalMist =
      BigInt(gasUsed.computationCost) +
      BigInt(gasUsed.storageCost) -
      BigInt(gasUsed.storageRebate) +
      BigInt(gasUsed.nonRefundableStorageFee);

    return Number(totalMist) / Number(MIST_PER_SUI);
  }
}
