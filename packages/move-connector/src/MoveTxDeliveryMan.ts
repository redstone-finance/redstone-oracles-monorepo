import {
  Account,
  AptosApiError,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import {
  loggerFactory,
  OperationQueue,
  RedstoneCommon,
} from "@redstone-finance/utils";
import _ from "lodash";
import { TRANSACTION_DEFAULT_CONFIG } from "./config";
import { CommittedTransaction, MoveClient } from "./MoveClient";
import { MoveOptionsContractUtil } from "./MoveOptionsContractUtil";
import { TransactionConfig } from "./types";

const SEQUENCE_NUMBER_TOO_OLD_CODE = "SEQUENCE_NUMBER_TOO_OLD".toLowerCase();

export type DeferredDataProvider = (
  iterationIndex: number
) => Promise<MoveTransactionData>;

export type MoveTransactionData = InputGenerateTransactionPayloadData & {
  identifier: string;
  deferredDataProvider?: DeferredDataProvider;
};

export class MoveTxDeliveryMan {
  private readonly logger = loggerFactory("move-tx-delivery-man");
  private sequenceNumber = 0n;
  private static readonly queues: { [p: string]: OperationQueue } = {};

  static getQueue(account: Account) {
    this.queues[account.accountAddress.toString()] ??= new OperationQueue();

    return this.queues[account.accountAddress.toString()];
  }

  constructor(
    private readonly client: MoveClient,
    private readonly account: Account,
    private readonly config: TransactionConfig = TRANSACTION_DEFAULT_CONFIG
  ) {}

  getSignerAddress() {
    return this.account.accountAddress;
  }

  async sendBatchTransactions(data: Promise<MoveTransactionData>[]) {
    let hash = undefined;
    for (const input of data) {
      try {
        hash = await this.sendTransaction(await input);
      } catch (e) {
        this.logger.error(
          `${(await input).identifier} failed: ${RedstoneCommon.stringifyError(e)}`
        );
      }
    }

    if (!hash) {
      throw new Error("No transaction committed with success.");
    }

    return hash;
  }

  async sendTransaction(data: MoveTransactionData) {
    if (!this.sequenceNumber) {
      await this.refreshSequenceNumber();
    }

    for (let i = 0; i < this.config.maxTxSendAttempts; i++) {
      try {
        return await this.performIteration(data, i);
      } catch (e) {
        await this.processTransactionError(e);
      }
    }
    throw new Error(
      `${data.identifier} failed to send in ${this.config.maxTxSendAttempts} attempt${RedstoneCommon.getS(this.config.maxTxSendAttempts)}`
    );
  }

  private async performIteration(
    data: MoveTransactionData,
    iterationIndex: number
  ) {
    return await new Promise<string>((resolve, reject) => {
      this.logger.debug(`Enqueuing #${iterationIndex} ${data.identifier}`);
      const wasEnqueued = MoveTxDeliveryMan.getQueue(this.account).enqueue(
        data.identifier,
        async () => {
          try {
            const newData = data.deferredDataProvider
              ? await data.deferredDataProvider(iterationIndex)
              : data;

            resolve(await this.tryCallFunction(newData, iterationIndex));
          } catch (e) {
            reject(e);
          }
        }
      );

      if (!wasEnqueued) {
        reject(
          new Error(
            `Enqueuing #${iterationIndex} ${data.identifier} FAILED because a previous transaction is still executing`
          )
        );
      } else {
        this.logger.debug(`Enqueued #${iterationIndex} ${data.identifier}`);
      }
    });
  }

  private async tryCallFunction(
    data: MoveTransactionData,
    iterationIndex: number
  ) {
    const options = await MoveOptionsContractUtil.prepareTransactionOptions(
      this.client,
      this.config.writePriceOctasTxGasBudget,
      iterationIndex,
      iterationIndex && this.sequenceNumber ? this.sequenceNumber : undefined
    );

    this.logger.info(
      [
        `Running ${data.identifier}`,
        iterationIndex ? `Retry #${iterationIndex + 1}` : undefined,
        options.accountSequenceNumber
          ? `sequenceNumber: ${options.accountSequenceNumber}`
          : undefined,
      ]
        .filter((x) => x != undefined)
        .join("; ")
    );

    const pendingTransaction = await this.client.sendSimpleTransaction(
      data,
      this.account,
      options
    );

    const committedTransaction = await this.client.waitForTransaction(
      pendingTransaction.hash
    );

    if (!committedTransaction.success) {
      throw new Error(
        `${data.identifier}: Transaction ${committedTransaction.hash} failed.`
      );
    }

    this.processCommittedTransaction(committedTransaction);

    return pendingTransaction.hash;
  }

  private async refreshSequenceNumber() {
    this.setSequenceNumber(
      await this.client.getSequenceNumber(this.account.accountAddress)
    );
  }

  private setNextSequenceNumber(sequenceNumber: string) {
    this.setSequenceNumber(BigInt(sequenceNumber) + 1n);
  }

  private setSequenceNumber(sequenceNumber: bigint) {
    if (sequenceNumber === this.sequenceNumber) {
      return;
    }
    this.logger.info(
      `Setting sequenceNumber: ${sequenceNumber}; Current value: ${RedstoneCommon.stringify(this.sequenceNumber)} (+${sequenceNumber - this.sequenceNumber})`
    );
    this.sequenceNumber = sequenceNumber;
  }

  private processCommittedTransaction(tx: CommittedTransaction) {
    this.logger.log(
      `Transaction ${tx.hash} finished, status: COMMITTED, cost: ${tx.cost} MOVE.`
    );

    if (tx.sequenceNumber) {
      this.setNextSequenceNumber(tx.sequenceNumber);
    }
  }

  private async processTransactionError(e: unknown) {
    let didLog = false;
    const failInfo = MoveTxDeliveryMan.maybeGetTransactionFailInfo(e);
    if (failInfo) {
      this.logger.error(
        failInfo.vm_status,
        MoveTxDeliveryMan.extractSimpleFields(failInfo)
      );

      didLog = true;

      this.setNextSequenceNumber(failInfo.sequence_number);
    } else if (MoveTxDeliveryMan.isSequenceNumberTooOldError(e)) {
      await this.refreshSequenceNumber();
    }

    if (didLog) {
      return;
    }

    this.logger.error(RedstoneCommon.stringifyError(e));
  }

  private static maybeGetTransactionFailInfo(
    e: unknown
  ): { sequence_number: string; vm_status: string } | undefined {
    if (e instanceof AggregateError) {
      return e.errors
        .map(MoveTxDeliveryMan.maybeGetTransactionFailInfo)
        .filter(RedstoneCommon.isDefined)
        .at(0);
    }

    if ("transaction" in (e as Error)) {
      const fail = e as {
        transaction: { sequence_number: string; vm_status: string };
      };

      return fail.transaction;
    }

    return undefined;
  }

  private static isSequenceNumberTooOldError(e: unknown) {
    if (e instanceof AggregateError) {
      return e.errors.some(MoveTxDeliveryMan.isSequenceNumberTooOldError);
    }
    return (
      e instanceof AptosApiError &&
      e.message.toLowerCase().includes(SEQUENCE_NUMBER_TOO_OLD_CODE)
    );
  }

  private static extractSimpleFields(error: object) {
    return _.pickBy(
      error,
      (value) =>
        _.isString(value) ||
        _.isNumber(value) ||
        _.isBoolean(value) ||
        _.isNil(value)
    );
  }
}
