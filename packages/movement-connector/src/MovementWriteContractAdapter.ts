import {
  Account,
  AccountAddress,
  Aptos,
  InputGenerateTransactionPayloadData,
  MoveFunctionId,
  MoveVector,
  TransactionWorkerEventsEnum,
} from "@aptos-labs/ts-sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { TRANSACTION_DEFAULT_CONFIG } from "./config";
import { MovementOptionsContractUtil } from "./MovementOptionsContractUtil";
import { IMovementWriteContractAdapter, TransactionConfig } from "./types";
import { makeFeedIdBytes } from "./utils";

export class MovementWriteContractAdapter
  implements IMovementWriteContractAdapter
{
  protected readonly logger = loggerFactory("movement-write-contract-adapter");

  constructor(
    private readonly client: Aptos,
    private readonly account: Account,
    private readonly priceAdapterPackageAddress: AccountAddress,
    private readonly priceAdapterObjectAddress: AccountAddress,
    private readonly optionsProvider: MovementOptionsContractUtil,
    private readonly config: TransactionConfig = TRANSACTION_DEFAULT_CONFIG
  ) {}

  async writePricesBatch(
    payloads: { payload: string; feedId: string }[]
  ): Promise<string> {
    const data = [];

    for (const { payload, feedId } of payloads) {
      data.push({
        function:
          `${this.priceAdapterPackageAddress.toString()}::price_adapter::write_price` as MoveFunctionId,
        functionArguments: [
          this.priceAdapterObjectAddress.toString(),
          makeFeedId(feedId),
          makePayload(payload),
        ],
      });
    }

    await this.sendBatchTransactions(data);
    return await this.waitForNSent(data.length);
  }

  private async sendBatchTransactions(
    data: InputGenerateTransactionPayloadData[]
  ) {
    for (let i = 0; i < this.config.maxTxSendAttempts; i++) {
      try {
        return await this.trySendBatchTransactions(data, i);
      } catch {
        this.logger.info(`Retrying ${i + 1} time to batch send transactions.`);
      }
    }
  }

  private async trySendBatchTransactions(
    data: InputGenerateTransactionPayloadData[],
    iteration: number
  ) {
    const options = await this.optionsProvider.prepareTransactionOptions(
      this.config.writePriceOctasTxGasBudget,
      iteration
    );
    this.client.transaction.batch.removeAllListeners();
    this.logger.debug(`Sending ${data.length} transactions`);
    this.client.transaction.batch.forSingleAccount({
      sender: this.account,
      data,
      options,
    });
  }

  private async waitForNSent(n: number): Promise<string> {
    return await new Promise((resolve) => {
      let sent = 0;
      this.client.transaction.batch.on(
        TransactionWorkerEventsEnum.TransactionSent,
        (data) => {
          sent += 1;
          this.logger.debug(
            `Sent transaction ${data.transactionHash}, msg: ${data.message}. ${sent}/${n}`
          );
          if (sent === n) {
            resolve(data.transactionHash);
          }
        }
      );
    });
  }
}

function makeFeedId(feedId: string) {
  const asBytes = makeFeedIdBytes(feedId);

  return MoveVector.U8(asBytes);
}

function makePayload(payload: string) {
  return MoveVector.U8(payload);
}
