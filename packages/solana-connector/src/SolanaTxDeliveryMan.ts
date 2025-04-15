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
import _ from "lodash";
import { SolanaConfig } from "./config";
import {
  ALL_EXECUTIONS_TIMEOUT_MS,
  SINGLE_EXECUTION_TIMEOUT_MS,
} from "./SolanaConnectionBuilder";

const RETRY_WAIT_TIME_MS = 500;

export type TransactionInstructionsCreator = (inputs: string[]) => Promise<
  {
    instruction: TransactionInstruction;
    id: string;
  }[]
>;

export class SolanaTxDeliveryMan {
  private readonly logger = loggerFactory("solana-tx-delivery-man");

  constructor(
    private readonly connection: Connection,
    private readonly keypair: Keypair,
    private readonly config: SolanaConfig
  ) {}

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
      `Sending transactions, attempt ${iterationIndex + 1}/${this.config.maxTxAttempts}`
    );
    this.logger.info(`Trying to send transactions for ${txIds.toString()}`);

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
          `Failed transaction for ${id}, ${RedstoneCommon.stringifyError(err)}.`
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
    const priorityFeeUnitPriceCostInMicroLamports = await this.getFee(
      ix,
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

    this.logger.info(`Setting transaction compute units to ${computeUnits}`);
    if (priorityFeeUnitPriceCostInMicroLamports) {
      this.logger.info(
        `Additional cost of transaction: ${computeUnits * priorityFeeUnitPriceCostInMicroLamports} microLamports.`
      );
    }

    const message = new TransactionMessage({
      payerKey: this.keypair.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(message);
  }

  private async getFee(ix: TransactionInstruction, iteration = 0) {
    if (iteration === 0) {
      return 0;
    }
    const writableKeys = ix.keys
      .filter((meta) => meta.isWritable)
      .map((meta) => meta.pubkey);
    const fees = await this.connection.getRecentPrioritizationFees({
      lockedWritableAccounts: [this.keypair.publicKey, ...writableKeys],
    });

    const recentFee = _.maxBy(fees, (fee) => fee.slot)?.prioritizationFee;
    const priorityFeeUnitPriceCostInMicroLamports = Math.ceil(
      this.config.gasMultiplier ** iteration
    );

    const fee = recentFee
      ? Math.max(recentFee, priorityFeeUnitPriceCostInMicroLamports)
      : priorityFeeUnitPriceCostInMicroLamports;

    const finalFeePerUnit = Math.min(fee, this.config.maxPricePerComputeUnit);

    this.logger.info(
      `RecentFee: ${recentFee}, calculated fee by iteration: ${priorityFeeUnitPriceCostInMicroLamports}`
    );
    this.logger.info(
      `Max price per compute unit: ${this.config.maxPricePerComputeUnit}`
    );
    this.logger.info(`Setting transaction cost per unit to ${finalFeePerUnit}`);

    return finalFeePerUnit;
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
