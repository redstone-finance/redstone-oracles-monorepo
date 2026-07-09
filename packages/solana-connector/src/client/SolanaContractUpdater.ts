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

const MAX_FEED_COUNT_IN_UPDATE = 1;
const COMPUTE_UNITS_PER_SIGNER = 40_000;

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
      ? new AggressiveSolanaGasOracle(client, config)
      : new RegularSolanaGasOracle(config);

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

  public getKeypair() {
    return this.keypair;
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
    const computeUnits = COMPUTE_UNITS_PER_SIGNER * paramsProvider.requestParams.uniqueSignersCount;
    const transactionHash = await FP.mapAsyncStringifyError(ix, (ix) =>
      this.sendAndConfirm(feedId, ix, attempt, computeUnits)
    );

    return FP.mapStringifyError(transactionHash, (transactionHash) => ({ transactionHash }));
  }

  private async sendAndConfirm(
    id: string,
    instruction: TransactionInstruction,
    iterationIndex: number,
    computeUnits: number
  ) {
    const message = await this.wrapWithGas(instruction, iterationIndex, computeUnits);
    const tx = new VersionedTransaction(message.compileToV0Message());

    tx.sign([this.keypair]);

    const signature = await this.client.sendTransaction(tx, {
      skipPreflight: true,
    });

    await this.waitForTransaction(signature, id);

    return signature;
  }

  private async wrapWithGas(ix: TransactionInstruction, iteration: number, computeUnits: number) {
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
