import {
  Account,
  AccountAddress,
  Aptos,
  EntryFunctionArgumentTypes,
  MoveVector,
  SimpleEntryFunctionArgumentTypes,
  SimpleTransaction,
  U8,
} from "@aptos-labs/ts-sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { IMovementWriteContractAdapter } from "./types";

const MAX_TRANSACTION_BYTE_SIZE: number = 64 * 1024; // Source in here: https://github.com/movementlabsxyz/aptos-core/blob/991668fa0dac6fa5bb31b2865194c0d6292ca1b5/aptos-move/aptos-gas-schedule/src/gas_schedule/transaction.rs#L72

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

  private async prepareTransaction(
    module: string,
    functionName: string,
    functionArgument?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >
  ): Promise<SimpleTransaction> {
    return await this.client.transaction.build.simple({
      sender: this.account.accountAddress,
      data: {
        function: `${this.priceAdapterPackageAddress.toString()}::${module}::${functionName}`,
        functionArguments: functionArgument ? functionArgument : [],
      },
    });
  }

  private verifyTransactionLength(transaction: SimpleTransaction) {
    const transactionSize = transaction.bcsToBytes().length;
    if (transactionSize > MAX_TRANSACTION_BYTE_SIZE) {
      throw new Error(
        `Expected maximum transaction size in bytes exceeded: Expected max ${MAX_TRANSACTION_BYTE_SIZE}, got ${transactionSize}.`
      );
    }
  }

  private async signAndPublish(
    transaction: SimpleTransaction
  ): Promise<string> {
    const pendingTxn = await this.client.signAndSubmitTransaction({
      signer: this.account,
      transaction,
    });

    return pendingTxn.hash;
  }

  async writePrices(
    feedIds: MoveVector<MoveVector<U8>>,
    payload: MoveVector<U8>
  ): Promise<string> {
    const transaction = await this.prepareTransaction(
      "price_adapter",
      "write_prices",
      [this.priceAdapterObjectAddress, feedIds, payload]
    );

    this.verifyTransactionLength(transaction);

    return await this.signAndPublish(transaction);
  }
}
