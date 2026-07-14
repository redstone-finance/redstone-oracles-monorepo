import {
  ContractUpdateContext,
  ContractUpdater,
  MultiTxDeliveryMan,
  TxDeliveryMan,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { MICRO_LAMPORTS_PER_LAMPORT, SolanaConfig } from "../config";
import { AggressiveSolanaGasOracle } from "../gas-oracles/AggressiveSolanaGasOracle";
import { ISolanaGasOracle } from "../gas-oracles/ISolanaGasOracle";
import { RegularSolanaGasOracle } from "../gas-oracles/RegularSolanaGasOracle";
import { PriceAdapterContract } from "../price_adapter/PriceAdapterContract";
import { SolanaRustSdkErrroHandler } from "../price_adapter/SolanaRustSdkErrorHandler";
import { getRecentBlockhash } from "./get-recent-blockhash";
import { SOLANA_SLOT_TIME_INTERVAL_MS, SolanaClient } from "./SolanaClient";
import { SolanaTxSender } from "./SolanaTxSender";

const COMPUTE_UNITS_PER_SIGNER = 40_000;

export class SolanaContractUpdater implements ContractUpdater {
  protected readonly logger = loggerFactory("solana-contract-updater");
  private readonly gasOracle: ISolanaGasOracle;
  private readonly txDeliveryMan: TxDeliveryMan;

  constructor(
    private readonly client: SolanaClient,
    private readonly config: SolanaConfig,
    private readonly keypair: Keypair,
    private readonly contract: PriceAdapterContract,
    private readonly sender: SolanaTxSender,
    txDeliveryManOverride?: TxDeliveryMan
  ) {
    this.gasOracle = config.useAggressiveGasOracle
      ? new AggressiveSolanaGasOracle(client, config)
      : new RegularSolanaGasOracle(config);

    this.txDeliveryMan =
      txDeliveryManOverride ??
      new MultiTxDeliveryMan(
        {
          expectedTxDeliveryTimeInMs: config.expectedTxDeliveryTimeMs,
          maxTxSendAttempts: config.maxTxAttempts,
          batchSizePerRequestParams: () => this.sender.maxFeeds,
        },
        "solana-contract-tx-delivery-man"
      );
  }

  getPublicKey() {
    return this.keypair.publicKey;
  }

  getKeypair() {
    return this.keypair;
  }

  getContract() {
    return this.contract;
  }

  async writePrices(paramsProvider: ContractParamsProvider, context?: ContractUpdateContext) {
    return await this.txDeliveryMan.updateContract(this, paramsProvider, context);
  }

  async update(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext,
    attempt: number
  ) {
    return await this.deliver(paramsProvider, context, attempt);
  }

  protected async deliver(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext,
    attempt = 0
  ) {
    return await FP.tryCallAsyncStringifyError(async () => {
      const transactions = await this.buildFeedTransactions(paramsProvider, context, attempt);
      const signature = await this.sender.send(transactions);

      await this.waitForTransaction(signature, paramsProvider.getDataFeedIds().join(","));

      return { transactionHash: signature };
    });
  }

  private payloadMetadata(context: ContractUpdateContext) {
    return {
      withUnsignedMetadata: true,
      metadataTimestamp: context.updateStartTimeMs,
      componentName: "solana-connector",
    };
  }

  private async buildFeedTransactions(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext,
    attempt: number
  ) {
    const [splitPayloads, recentBlockhash] = await Promise.all([
      paramsProvider.prepareSplitPayloads(this.payloadMetadata(context)),
      getRecentBlockhash(this.client, "solana-write"),
    ]);
    const { payloads } = ContractParamsProvider.extractMissingValues(splitPayloads, this.logger);
    const feedPayloads = Object.entries(payloads);
    if (feedPayloads.length === 0) {
      throw new Error("No feeds to write");
    }

    const uniqueSignerCount = paramsProvider.requestParams.uniqueSignersCount;

    return await Promise.all(
      feedPayloads.map(([feedId, payload]) =>
        this.buildFeedTx(feedId, payload, uniqueSignerCount, attempt, recentBlockhash)
      )
    );
  }

  private async buildFeedTx(
    feedId: string,
    payload: string,
    uniqueSignerCount: number,
    attempt: number,
    recentBlockhash: string
  ) {
    const priceInstruction = await this.contract.writePriceTx(
      this.keypair.publicKey,
      feedId,
      payload
    );
    const computeUnits = COMPUTE_UNITS_PER_SIGNER * uniqueSignerCount;

    const message = await this.wrapWithGas(
      priceInstruction,
      attempt,
      computeUnits,
      recentBlockhash
    );
    const tx = new VersionedTransaction(message.compileToV0Message());
    tx.sign([this.keypair]);

    return tx;
  }

  private async wrapWithGas(
    ix: TransactionInstruction,
    iteration: number,
    computeUnits: number,
    recentBlockhash: string
  ) {
    const writableKeys = ix.keys.filter((meta) => meta.isWritable).map((meta) => meta.pubkey);
    const priorityFeeUnitPriceCostInMicroLamports = await this.gasOracle.getPriorityFeePerUnit(
      iteration,
      [this.keypair.publicKey, ...writableKeys],
      computeUnits
    );

    const computeUnitsInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    });

    const setComputeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFeeUnitPriceCostInMicroLamports,
    });

    const instructions = [computeUnitsInstruction, setComputeUnitPriceInstruction, ix];

    this.logger.trace(`Setting transaction compute units to ${computeUnits}`);
    if (priorityFeeUnitPriceCostInMicroLamports) {
      const additionalCostInSol =
        (computeUnits * priorityFeeUnitPriceCostInMicroLamports) /
        MICRO_LAMPORTS_PER_LAMPORT /
        LAMPORTS_PER_SOL;
      this.logger.info(`Additional cost of transaction: ${additionalCostInSol} SOL`);
    }

    return new TransactionMessage({
      payerKey: this.keypair.publicKey,
      recentBlockhash,
      instructions,
    });
  }

  private async waitForTransaction(txSignature: string, id: string) {
    await RedstoneCommon.waitForSuccess(
      async () => {
        const result = await this.client.getSignatureStatus(txSignature);
        if (result.error) {
          if (SolanaRustSdkErrroHandler.canSkipError(result.error)) {
            this.logger.warn(
              `Treating ${id} update as successful without an on-chain write; tx ${txSignature} was rejected with a skippable error (on-chain state already newer or equal)`
            );

            return true;
          }

          throw new Error(RedstoneCommon.stringify(result.error));
        }

        return result.isFinished;
      },
      Math.floor(this.config.expectedTxDeliveryTimeMs / SOLANA_SLOT_TIME_INTERVAL_MS),
      `Could not confirm transaction ${txSignature} for ${id}`,
      SOLANA_SLOT_TIME_INTERVAL_MS,
      `getSignatureStatus ${txSignature}`
    );
  }
}
