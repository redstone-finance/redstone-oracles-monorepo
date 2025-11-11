import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { ParallelTransactionExecutor, Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory } from "@redstone-finance/utils";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";
import { SuiPricesContractWriter } from "./SuiPricesContractWriter";
import { SuiConfig } from "./config";

const MAX_PARALLEL_TRANSACTION_COUNT = 5;
const SPLIT_COIN_INITIAL_BALANCE = 2n * DEFAULT_GAS_BUDGET;

export class SuiContractUpdater implements ContractUpdater {
  protected readonly logger = loggerFactory("sui-contract-updater");
  private readonly writer: SuiPricesContractWriter;

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    config: SuiConfig,
    private executor?: ParallelTransactionExecutor
  ) {
    this.writer = new SuiPricesContractWriter(client, keypair, config);
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

  private async performExecutingTx(tx: Transaction) {
    const date = Date.now();
    const { digest, data } = await this.executeTxWithExecutor(tx, this.getExecutor());

    const checkEventsForFailure = true;
    const { status } = SuiContractUpdater.getStatus(data, checkEventsForFailure);
    const cost = SuiContractUpdater.getCost(data);

    this.logger.log(
      `Transaction ${digest} finished in ${Date.now() - date} [ms], status: ${status.toUpperCase()}, cost: ${cost} SUI`,
      {
        errors: data.errors,
        gasUsed: data.effects!.gasUsed,
        gasData: data.transaction!.data.gasData,
      }
    );

    return digest;
  }

  private async executeTxWithExecutor(tx: Transaction, executor: ParallelTransactionExecutor) {
    try {
      return await executor.executeTransaction(tx, {
        showEffects: true,
        showBalanceChanges: true,
        showInput: true,
        showEvents: true,
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

  static getStatus(response: SuiTransactionBlockResponse, checkEvents = false) {
    let status = response.effects!.status.status;
    const error = response.effects?.status.error;

    let success = status === "success";

    if (checkEvents) {
      const events = response.events;

      const writePriceEvent = events
        ? events.every((event) => !event.type.includes("price_adapter::UpdateError"))
        : false;

      success = success && writePriceEvent;
      status = success ? status : "failure";
    }

    return { status, success, error };
  }

  private static getCost(response: SuiTransactionBlockResponse) {
    if (!response.effects) {
      return 0;
    }

    const gasUsed = response.effects.gasUsed;
    const totalMist =
      BigInt(gasUsed.computationCost) +
      BigInt(gasUsed.storageCost) -
      BigInt(gasUsed.storageRebate) +
      BigInt(gasUsed.nonRefundableStorageFee);

    return Number(totalMist) / Number(MIST_PER_SUI);
  }
}
