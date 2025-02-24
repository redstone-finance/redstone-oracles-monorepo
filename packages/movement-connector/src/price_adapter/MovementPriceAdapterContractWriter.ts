import {
  Account,
  Aptos,
  InputGenerateTransactionPayloadData,
  MoveFunctionId,
  MoveVector,
} from "@aptos-labs/ts-sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { TRANSACTION_DEFAULT_CONFIG } from "../config";
import { MovementOptionsContractUtil } from "../MovementOptionsContractUtil";
import {
  IMovementPriceAdapterContractWriter,
  TransactionConfig,
} from "../types";
import { makeFeedIdBytes } from "../utils";

export class MovementPriceAdapterContractWriter
  implements IMovementPriceAdapterContractWriter
{
  protected readonly logger = loggerFactory("movement-write-contract-adapter");

  constructor(
    private readonly client: Aptos,
    private readonly account: Account,
    private readonly priceAdapterPackageAddress: string,
    private readonly priceAdapterObjectAddress: string,
    private readonly optionsProvider: MovementOptionsContractUtil,
    private readonly config: TransactionConfig = TRANSACTION_DEFAULT_CONFIG
  ) {}

  async writePrices(
    payloads: { payload: string; feedId: string }[]
  ): Promise<string> {
    let hash;

    for (const { payload, feedId } of payloads) {
      try {
        hash = await this.retrySendTransaction({
          function:
            `${this.priceAdapterPackageAddress.toString()}::price_adapter::write_price` as MoveFunctionId,
          functionArguments: [
            this.priceAdapterObjectAddress.toString(),
            makeFeedId(feedId),
            makePayload(payload),
          ],
        });
      } catch (e) {
        this.logger.error(
          `Write price for feed: ${feedId} failed with message: ${RedstoneCommon.stringifyError(e)}`
        );
      }
    }

    if (!hash) {
      throw new Error("No transaction committed with success.");
    }

    return hash;
  }

  private async retrySendTransaction(
    data: InputGenerateTransactionPayloadData
  ) {
    for (let i = 0; i < this.config.maxTxSendAttempts; i++) {
      try {
        return await this.trySendTransaction(data, i);
      } catch {
        this.logger.info(`Retrying ${i + 1} time to send transaction.`);
      }
    }
    throw new Error(`${this.config.maxTxSendAttempts} attempts unsuccessful.`);
  }

  private async trySendTransaction(
    data: InputGenerateTransactionPayloadData,
    iteration: number
  ) {
    const options = await this.optionsProvider.prepareTransactionOptions(
      this.config.writePriceOctasTxGasBudget,
      iteration
    );

    const transaction = await this.client.transaction.build.simple({
      sender: this.account.accountAddress,
      data,
      options,
    });

    const pendingTransaction =
      await this.client.transaction.signAndSubmitTransaction({
        transaction,
        signer: this.account,
      });

    const candidateTransaction =
      await this.client.transaction.waitForTransaction({
        transactionHash: pendingTransaction.hash,
      });

    if (!candidateTransaction.success) {
      throw new Error(`Transaction ${candidateTransaction.hash} failed.`);
    }

    return candidateTransaction.hash;
  }
}

function makeFeedId(feedId: string) {
  const asBytes = makeFeedIdBytes(feedId);

  return MoveVector.U8(asBytes);
}

function makePayload(payload: string) {
  return MoveVector.U8(payload);
}
