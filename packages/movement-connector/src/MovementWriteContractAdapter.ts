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
import { IMovementWriteContractAdapter } from "./types";
import { makeFeedIdBytes } from "./utils";

export class MovementWriteContractAdapter
  implements IMovementWriteContractAdapter
{
  protected readonly logger = loggerFactory("movement-contract-adapter");

  constructor(
    private readonly client: Aptos,
    private readonly account: Account,
    private readonly priceAdapterPackageAddress: AccountAddress,
    private readonly priceAdapterObjectAddress: AccountAddress
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

    this.sendBatchTransactions(data);
    return await this.waitForNSent(data.length);
  }

  sendBatchTransactions(data: InputGenerateTransactionPayloadData[]) {
    this.client.transaction.batch.removeAllListeners();
    this.logger.debug(`Sending ${data.length} transactions`);
    this.client.transaction.batch.forSingleAccount({
      sender: this.account,
      data,
    });
  }

  async waitForNSent(n: number): Promise<string> {
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
