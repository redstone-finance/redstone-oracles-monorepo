import type { SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { ParallelTransactionExecutor, Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { ContractUpdateContext, ContractUpdater } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { extractSuiUpdateErrors } from "../client/lookup/SuiEventParsing";
import { computeSuiGasUsed } from "../client/lookup/SuiTxParsing";
import { SuiClient } from "../client/SuiClient";
import { SuiConfig } from "../config";
import { SuiCoinProvider } from "../SuiCoinProvider";
import { SuiPricesContractWriter } from "./SuiPricesContractWriter";

export const MAX_PARALLEL_TRANSACTION_COUNT = 8;
const SPLIT_COIN_INITIAL_BALANCE_MULTIPLIER = 2n;
const SPLIT_COIN_TX_COST = MIST_PER_SUI / 100n;

type ExecutedTransaction = NonNullable<
  SuiClientTypes.TransactionResult<{ effects: true; events: true }>["Transaction"]
>;

export class SuiContractUpdater implements ContractUpdater {
  protected readonly logger = loggerFactory("sui-contract-updater");
  private readonly writer: SuiPricesContractWriter;
  private readonly coinProvider: SuiCoinProvider;
  private inFlightCount = 0;
  private reinitPromise?: Promise<ParallelTransactionExecutor>;

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
  ) {
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
    const { status, causes } = SuiContractUpdater.getStatus(txData);
    const cost = SuiContractUpdater.getCost(txData.effects);
    const errorsInfo = status === "failure" ? `, errors: ${causes.join("; ")}` : "";

    this.logger.log(
      `Transaction ${txData.digest} finished in ${Date.now() - date} [ms], status: ${status.toUpperCase()}, cost: ${cost} SUI${errorsInfo}`
    );

    if (!txData.effects.status.success) {
      throw new AggregateError(
        causes.map((cause) => new Error(cause)),
        `Transaction ${txData.digest} failed`
      );
    }

    return txData.digest;
  }

  private async executeTxWithExecutor(tx: Transaction, executor: ParallelTransactionExecutor) {
    this.inFlightCount += 1;
    try {
      return await executor.executeTransaction(tx, {
        effects: true,
        events: true,
      });
    } catch (e) {
      await this.maybeReinitializeExecutor();

      throw e;
    } finally {
      this.inFlightCount -= 1;
    }
  }

  private async maybeReinitializeExecutor() {
    if (this.inFlightCount > 1 && !this.reinitPromise) {
      this.logger.warn("Skipping gas objects reinitialization, other transactions are in flight");

      return;
    }

    this.logger.warn("Reinitializing gas objects...");
    try {
      await this.initializeExecutorOnce();
    } catch (e) {
      this.logger.warn(`Failed to reinitialize gas objects: ${RedstoneCommon.stringifyError(e)}`);
    }
  }

  private async getExecutor() {
    return this.executor ?? (await this.initializeExecutorOnce());
  }

  private async initializeExecutorOnce() {
    this.reinitPromise ??= this.initializeExecutor().finally(() => {
      this.reinitPromise = undefined;
    });

    return await this.reinitPromise;
  }

  private async initializeExecutor() {
    const initialCoinBalance =
      SPLIT_COIN_INITIAL_BALANCE_MULTIPLIER * this.config.writePricesTxGasBudget;
    const minimumBalance =
      initialCoinBalance * BigInt(MAX_PARALLEL_TRANSACTION_COUNT) + SPLIT_COIN_TX_COST;

    const sourceCoins = await this.coinProvider.getSourceCoins(minimumBalance, this.keypair);

    const executor = new ParallelTransactionExecutor({
      client: this.client.clientWithCoreApi,
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

  private static getStatus(txData: ExecutedTransaction) {
    const { success, error } = txData.effects.status;
    const updateErrors = extractSuiUpdateErrors(txData.events);
    const status = !success || updateErrors.length > 0 ? "failure" : "success";
    const causes = updateErrors.length > 0 ? updateErrors : [RedstoneCommon.stringifyError(error)];

    return { status, causes };
  }

  private static getCost(effects: ExecutedTransaction["effects"]) {
    return computeSuiGasUsed(effects.gasUsed) / Number(MIST_PER_SUI);
  }
}
