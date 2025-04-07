import { AnchorProvider, Provider, Wallet } from "@coral-xyz/anchor";
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

export type TransactionInstructionsCreator<T> = (inputs: T[]) => Promise<
  {
    ix: TransactionInstruction;
    id: T;
  }[]
>;

export class SolanaTxDeliveryMan {
  private readonly logger = loggerFactory("solana-tx-delivery-man");

  constructor(
    private readonly provider: Provider,
    private readonly keypair: Keypair,
    private readonly config: SolanaConfig
  ) {
    if (!this.provider.sendAndConfirm) {
      throw new Error(
        "Required method by `SolanaTxDeliveryMan` `sendAndConfirm` method is not implemented by `provider`."
      );
    }
  }

  static createMultiTxDeliveryMan(
    connection: Connection,
    keypair: Keypair,
    config: SolanaConfig
  ) {
    const multiProvider = MultiExecutor.createForSubInstances(
      connection,
      (conn) => new AnchorProvider(conn, new Wallet(keypair)),
      {
        sendAndConfirm: MultiExecutor.ExecutionMode.RACE,
        connection: {
          getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
        },
      },
      {
        ...MultiExecutor.DEFAULT_CONFIG,
        singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );

    return new SolanaTxDeliveryMan(multiProvider, keypair, config);
  }

  private async sendTransactionsWithRetry<T>(
    txIds: T[],
    creator: TransactionInstructionsCreator<T>,
    iterationIndex = 0
  ) {
    if (iterationIndex >= this.config.maxTxAttempts) {
      throw new Error(`Max attempts reached: ${this.config.maxTxAttempts}`);
    }

    this.logger.info(
      `Sending transactions, attempt ${iterationIndex + 1}/${this.config.maxTxAttempts}`
    );
    this.logger.info(`Trying to send transactions for ${txIds.toString()}.`);

    const failedTxs: T[] = [];
    const successfullTxs: TransactionSignature[] = [];

    const sendAndConfirm = async (
      id: T,
      instruction: TransactionInstruction
    ) => {
      try {
        const signature = await this.provider.sendAndConfirm!(
          await this.wrapWithGas(instruction, iterationIndex)
        );
        successfullTxs.push(signature);
      } catch (err) {
        failedTxs.push(id);
        this.logger.error(
          `Failed transaction for ${RedstoneCommon.stringify(id)}, ${RedstoneCommon.stringifyError(err)}.`
        );
      }
    };

    const transactionsToSend = await creator(txIds);
    const promises = transactionsToSend.map(({ id, ix }) =>
      sendAndConfirm(id, ix)
    );
    await Promise.allSettled(promises);

    if (failedTxs.length !== 0) {
      const txSignatures = await this.sendTransactionsWithRetry(
        failedTxs,
        creator,
        iterationIndex + 1
      );
      successfullTxs.push(...txSignatures);
    }

    return successfullTxs;
  }

  async sendTransactions<T>(
    txIds: T[],
    ixCreator: TransactionInstructionsCreator<T>
  ) {
    const txSignatures = await this.sendTransactionsWithRetry(
      txIds,
      ixCreator,
      0
    );
    return txSignatures;
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
    this.logger.info(
      `Additional cost of transaction := ${computeUnits * priorityFeeUnitPriceCostInMicroLamports} microLamports.`
    );

    const message = new TransactionMessage({
      payerKey: this.keypair.publicKey,
      recentBlockhash: (await this.provider.connection.getLatestBlockhash())
        .blockhash,
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
    const fees = await this.provider.connection.getRecentPrioritizationFees({
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
      `RecentFee: ${recentFee}, calculated fee by iteration: ${priorityFeeUnitPriceCostInMicroLamports}.`
    );
    this.logger.info(
      `Max price per compute unit: ${this.config.maxPricePerComputeUnit}`
    );
    this.logger.info(`Setting transaction cost per unit to ${finalFeePerUnit}`);

    return finalFeePerUnit;
  }
}
