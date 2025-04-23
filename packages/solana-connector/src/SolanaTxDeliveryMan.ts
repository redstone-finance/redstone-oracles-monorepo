import {
  loggerFactory,
  MultiExecutor,
  RedstoneCommon,
} from "@redstone-finance/utils";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaConfig } from "./config";
import { AggressiveSolanaGasOracle } from "./gas-oracles/AggressiveSolanaGasOracle";
import { ISolanaGasOracle } from "./gas-oracles/ISolanaGasOracle";
import { RegularSolanaGasOracle } from "./gas-oracles/RegularSolanaGasOracle";
import {
  ALL_EXECUTIONS_TIMEOUT_MS,
  SINGLE_EXECUTION_TIMEOUT_MS,
} from "./SolanaConnectionBuilder";
import { SolanaRustSdkErrroHandler } from "./SolanaRustSdkErrorHandler";

const RETRY_WAIT_TIME_MS = 500;

export type TransactionInstructionsCreator = (inputs: string[]) => Promise<
  {
    instruction: TransactionInstruction;
    id: string;
  }[]
>;

export class SolanaTxDeliveryMan {
  private readonly logger = loggerFactory("solana-tx-delivery-man");
  private readonly gasOracle: ISolanaGasOracle;

  constructor(
    private readonly connection: Connection,
    private readonly keypair: Keypair,
    private readonly config: SolanaConfig
  ) {
    this.gasOracle = config.useAggressiveGasOracle
      ? new AggressiveSolanaGasOracle(connection, config)
      : new RegularSolanaGasOracle(connection, config);
  }

  static createMultiTxDeliveryMan(
    connection: Connection,
    keypair: Keypair,
    config: SolanaConfig
  ) {
    const multiConnection = MultiExecutor.createForSubInstances(
      connection,
      (conn) => conn,
      {
        getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
      },
      {
        ...MultiExecutor.DEFAULT_CONFIG,
        singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );

    return new SolanaTxDeliveryMan(multiConnection, keypair, config);
  }

  public getPublicKey() {
    return this.keypair.publicKey;
  }

  private async sendTransactionsWithRetry(
    txIds: string[],
    creator: TransactionInstructionsCreator,
    iterationIndex = 0,
    errors: unknown[] = []
  ) {
    if (iterationIndex >= this.config.maxTxAttempts) {
      throw new Error(
        `Max attempts reached: ${this.config.maxTxAttempts}. ${RedstoneCommon.stringifyError(new AggregateError(errors))}`
      );
    }

    this.logger.info(
      `Sending transaction${RedstoneCommon.getS(txIds.length)} for [${txIds.toString()}]${iterationIndex ? `; Attempt #${iterationIndex + 1}/${this.config.maxTxAttempts}` : ""}`
    );

    const failedTxs: string[] = [];
    const successfulTxs: TransactionSignature[] = [];

    const sendAndConfirmWrapper = async (
      id: string,
      instruction: TransactionInstruction
    ) => {
      try {
        const signature = await this.sendAndConfirm(
          id,
          instruction,
          iterationIndex
        );
        successfulTxs.push(signature);
      } catch (err) {
        errors.push(err);
        failedTxs.push(id);
        this.logger.error(
          `Failed transaction for ${id}, ${RedstoneCommon.stringifyError(err)}`
        );
      }
    };

    const transactionsToSend = await creator(txIds);
    const promises = transactionsToSend.map(({ id, instruction }) =>
      sendAndConfirmWrapper(id, instruction)
    );
    await Promise.allSettled(promises);

    if (failedTxs.length !== 0) {
      const txSignatures = await this.sendTransactionsWithRetry(
        failedTxs,
        creator,
        iterationIndex + 1,
        errors
      );
      successfulTxs.push(...txSignatures);
    }

    return successfulTxs;
  }

  async sendTransactions(
    txIds: string[],
    ixCreator: TransactionInstructionsCreator
  ) {
    return await this.sendTransactionsWithRetry(txIds, ixCreator);
  }

  private async wrapWithGas(ix: TransactionInstruction, iteration = 0) {
    const computeUnits = this.config.maxComputeUnits;
    const writableKeys = ix.keys
      .filter((meta) => meta.isWritable)
      .map((meta) => meta.pubkey);
    const priorityFeeUnitPriceCostInMicroLamports =
      await this.gasOracle.getPriorityFeePerUnit(
        [this.keypair.publicKey, ...writableKeys],
        iteration
      );

    const computeUnitsInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    });

    const setComputeUnitPriceInstruction =
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFeeUnitPriceCostInMicroLamports,
      });

    const instructions = [
      computeUnitsInstruction,
      setComputeUnitPriceInstruction,
      ix,
    ];

    this.logger.debug(`Setting transaction compute units to ${computeUnits}`);
    if (priorityFeeUnitPriceCostInMicroLamports) {
      this.logger.info(
        `Additional cost of transaction: ${computeUnits * priorityFeeUnitPriceCostInMicroLamports} microLamports`
      );
    }

    const message = new TransactionMessage({
      payerKey: this.keypair.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(message);
  }

  private async sendAndConfirm(
    id: string,
    instruction: TransactionInstruction,
    iterationIndex = 0
  ) {
    const tx = await this.wrapWithGas(instruction, iterationIndex);
    tx.sign([this.keypair]);

    const signature = await this.connection.sendTransaction(tx, {
      skipPreflight: true,
    });

    await this.waitForTransaction(signature, id);

    return signature;
  }

  private async waitForTransaction(txSignature: string, id: string) {
    await RedstoneCommon.waitForSuccess(
      async () => {
        const result = await this.connection.getSignatureStatus(txSignature);
        if (result.value !== null && result.value.err !== null) {
          if (SolanaRustSdkErrroHandler.canSkipError(result.value.err)) {
            return true;
          }
          throw new Error(RedstoneCommon.stringify(result.value.err));
        }

        const status = result.value?.confirmationStatus;

        return status === "confirmed" || status == "finalized";
      },
      Math.ceil(this.config.expectedTxDeliveryTimeMs / RETRY_WAIT_TIME_MS),
      `Could not confirm transaction ${txSignature} for ${id}`,
      RETRY_WAIT_TIME_MS,
      "SolanaTxDeliveryMan getSignatureStatus"
    );
  }
}
