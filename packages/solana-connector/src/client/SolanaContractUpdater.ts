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
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaConfig } from "../config";
import { AggressiveSolanaGasOracle } from "../gas-oracles/AggressiveSolanaGasOracle";
import { ISolanaGasOracle } from "../gas-oracles/ISolanaGasOracle";
import { RegularSolanaGasOracle } from "../gas-oracles/RegularSolanaGasOracle";
import { PriceAdapterContract } from "../price_adapter/PriceAdapterContract";
import { SolanaRustSdkErrroHandler } from "../price_adapter/SolanaRustSdkErrorHandler";
import { getRecentBlockhash } from "./get-recent-blockhash";
import { SOLANA_SLOT_TIME_INTERVAL_MS, SolanaClient } from "./SolanaClient";

const MAX_FEED_COUNT_IN_UPDATE = 1;

export class SolanaContractUpdater implements ContractUpdater {
  private readonly logger = loggerFactory("solana-contract-updater");
  private readonly gasOracle: ISolanaGasOracle;
  private readonly txDeliveryMan: TxDeliveryMan;

  constructor(
    private readonly client: SolanaClient,
    private readonly config: SolanaConfig,
    private readonly keypair: Keypair,
    private readonly contract: PriceAdapterContract
  ) {
    this.gasOracle = config.useAggressiveGasOracle
      ? new AggressiveSolanaGasOracle(config)
      : new RegularSolanaGasOracle(client, config);

    this.txDeliveryMan = new MultiTxDeliveryMan(
      {
        expectedTxDeliveryTimeInMs: config.expectedTxDeliveryTimeMs,
        maxTxSendAttempts: config.maxTxAttempts,
        batchSizePerRequestParams: () => MAX_FEED_COUNT_IN_UPDATE,
      },
      "solana-contract-tx-delivery-man"
    );
  }

  public getPublicKey() {
    return this.keypair.publicKey;
  }

  async writePrices(paramsProvider: ContractParamsProvider) {
    return await this.txDeliveryMan.updateContract(this, paramsProvider);
  }

  async update(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext,
    attempt: number
  ) {
    const feedCount = paramsProvider.getDataFeedIds().length;

    if (feedCount !== MAX_FEED_COUNT_IN_UPDATE) {
      return FP.err(`solana updater expects single feed in update call, got ${feedCount}`);
    }
    const feedId = paramsProvider.getDataFeedIds()[0];
    const payload = await FP.tryAwait(
      paramsProvider.getPayloadHex(false, {
        withUnsignedMetadata: true,
        metadataTimestamp: context.updateStartTimeMs,
        componentName: "solana-connector",
      })
    );

    const ix = await FP.mapAsyncStringifyError(payload, (payload) =>
      this.contract.writePriceTx(this.keypair.publicKey, feedId, payload)
    );
    const transactionHash = await FP.mapAsyncStringifyError(ix, (ix) =>
      this.sendAndConfirm(feedId, ix, attempt)
    );

    return FP.mapStringifyError(transactionHash, (transactionHash) => ({ transactionHash }));
  }

  private async sendAndConfirm(
    id: string,
    instruction: TransactionInstruction,
    iterationIndex = 0
  ) {
    const message = await this.wrapWithGas(instruction, iterationIndex);
    const tx = new VersionedTransaction(message.compileToV0Message());

    tx.sign([this.keypair]);

    const signature = await this.client.sendTransaction(tx, {
      skipPreflight: true,
    });

    await this.waitForTransaction(signature, id);

    return signature;
  }

  private async wrapWithGas(ix: TransactionInstruction, iteration: number) {
    const computeUnits = this.config.maxComputeUnits;
    const writableKeys = ix.keys.filter((meta) => meta.isWritable).map((meta) => meta.pubkey);
    const priorityFeeUnitPriceCostInMicroLamports = await this.gasOracle.getPriorityFeePerUnit(
      iteration,
      [this.keypair.publicKey, ...writableKeys]
    );

    const computeUnitsInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    });

    const setComputeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFeeUnitPriceCostInMicroLamports,
    });

    const instructions = [computeUnitsInstruction, setComputeUnitPriceInstruction, ix];

    this.logger.debug(`Setting transaction compute units to ${computeUnits}`);
    if (priorityFeeUnitPriceCostInMicroLamports) {
      this.logger.info(
        `Additional cost of transaction: ${computeUnits * priorityFeeUnitPriceCostInMicroLamports} microLamports`
      );
    }
    const recentBlockhash = await getRecentBlockhash(this.client, "wrapWithGas");

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
