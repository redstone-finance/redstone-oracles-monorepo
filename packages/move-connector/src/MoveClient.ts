import {
  Account,
  AccountAddress,
  Aptos,
  EntryFunctionArgumentTypes,
  InputGenerateTransactionOptions,
  InputGenerateTransactionPayloadData,
  MoveValue,
  SimpleEntryFunctionArgumentTypes,
} from "@aptos-labs/ts-sdk";
import { loggerFactory, MultiExecutor } from "@redstone-finance/utils";
import { txCost } from "./utils";

export type CommittedTransaction = {
  success: boolean;
  hash: string;
  sequenceNumber?: string;
  cost: number;
};

export class MoveClient {
  private readonly logger = loggerFactory("move-client");
  constructor(private readonly aptos: Aptos) {}

  getMultiAptos() {
    return MultiExecutor.createForSubInstances(this, (client) => client.aptos);
  }

  async getSequenceNumber(accountAddress: AccountAddress) {
    const accountInfo = await this.aptos.getAccountInfo({ accountAddress });
    this.logger.debug(
      `Fetched sequence number: ${accountInfo.sequence_number}`
    );

    return BigInt(accountInfo.sequence_number);
  }

  async waitForTransaction(
    transactionHash: string
  ): Promise<CommittedTransaction> {
    const transaction = await this.aptos.transaction.waitForTransaction({
      transactionHash,
    });

    const sequenceNumber =
      "sequence_number" in transaction
        ? transaction.sequence_number
        : undefined;

    return {
      success: transaction.success,
      hash: transaction.hash,
      sequenceNumber,
      cost: txCost(transaction),
    };
  }

  async sendSimpleTransaction(
    data: InputGenerateTransactionPayloadData,
    signer: Account,
    options?: InputGenerateTransactionOptions
  ) {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data,
      options,
    });

    return await this.aptos.transaction.signAndSubmitTransaction({
      transaction,
      signer,
    });
  }

  async getGasPriceEstimation() {
    return await this.aptos.getGasPriceEstimation();
  }

  async getBlockNumber(): Promise<number> {
    return Number((await this.aptos.getLedgerInfo()).block_height);
  }

  async getBalance(address: string) {
    return await this.aptos.account.getAccountAPTAmount({
      accountAddress: address,
    });
  }

  async viewOnChain<T extends Array<MoveValue> = Array<MoveValue>>(
    packageAddress: string,
    moduleName: string,
    functionName: string,
    functionArguments?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >
  ): Promise<T> {
    return await this.aptos.view({
      payload: {
        function: `${packageAddress}::${moduleName}::${functionName}`,
        typeArguments: [],
        functionArguments: functionArguments ?? [],
      },
    });
  }
}
