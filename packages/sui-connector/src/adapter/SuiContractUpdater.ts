import type { SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { ContractUpdateContext, ContractUpdater } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { extractSuiUpdateErrors } from "../client/lookup/SuiEventParsing";
import { computeSuiGasUsed } from "../client/lookup/SuiTxParsing";
import { SuiClient } from "../client/SuiClient";
import { SuiConfig } from "../config";
import { SuiPricesContractWriter } from "./SuiPricesContractWriter";

export const MAX_PARALLEL_TRANSACTION_COUNT = 8;

type ExecutedTransaction = NonNullable<
  SuiClientTypes.TransactionResult<{ effects: true; events: true }>["Transaction"]
>;

export class SuiContractUpdater implements ContractUpdater {
  protected readonly logger = loggerFactory("sui-contract-updater");
  private readonly writer: SuiPricesContractWriter;

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    config: SuiConfig
  ) {
    this.writer = new SuiPricesContractWriter(client, keypair, config);
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
    const result = await this.client.signAndExecute(tx, this.keypair);

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

  private static getStatus(txData: ExecutedTransaction) {
    const { success, error } = txData.effects.status;
    const updateErrors = extractSuiUpdateErrors(txData.events);
    const status = !success || updateErrors.length > 0 ? "failure" : "success";
    const causes =
      updateErrors.length > 0
        ? updateErrors.map(({ feedId, error: cause }) => `${feedId}: ${cause}`)
        : [RedstoneCommon.stringifyError(error)];

    return { status, causes };
  }

  private static getCost(effects: ExecutedTransaction["effects"]) {
    return computeSuiGasUsed(effects.gasUsed) / Number(MIST_PER_SUI);
  }
}
