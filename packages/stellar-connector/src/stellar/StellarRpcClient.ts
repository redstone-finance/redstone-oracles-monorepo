import { RedstoneCommon } from "@redstone-finance/utils";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import * as XdrUtils from "../XdrUtils";

const RETRY_COUNT = 10;
const SLEEP_TIME_MS = 1_000;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: RETRY_COUNT,
  waitBetweenMs: SLEEP_TIME_MS,
};

export class StellarRpcClient {
  constructor(private readonly server: rpc.Server) {}

  private async getAccount(publicKey: string): Promise<Account> {
    return await this.server.getAccount(publicKey);
  }

  async getAccountBalance(address: string) {
    const ledgerKey = XdrUtils.ledgerKeyFromAddress(address);

    const response = await this.server.getLedgerEntries(ledgerKey);

    return XdrUtils.accountFromResponse(response).balance().toBigInt();
  }

  async getBlockNumber() {
    return (await this.server.getLatestLedger()).sequence;
  }

  async waitForTx(hash: string) {
    return await RedstoneCommon.retry({
      fn: async () => {
        const response = await this.server.getTransaction(hash);
        if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return { returnValue: response.returnValue };
        }
        throw new Error(
          `Transaction did not succeed: ${hash}, status: ${response.status}`
        );
      },
      ...RETRY_CONFIG,
    })();
  }

  async simulateTransaction(transaction: Transaction) {
    const sim = await this.server.simulateTransaction(transaction);

    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new Error(
        `Simulation failed: ${RedstoneCommon.stringifyError(sim.error)}`
      );
    }

    return sim;
  }

  async executeOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    keypair: Keypair
  ) {
    const transaction = await this.transactionFromOperation(
      operation,
      keypair.publicKey()
    );
    const sim = await this.simulateTransaction(transaction);

    const assembled = rpc.assembleTransaction(transaction, sim).build();
    assembled.sign(keypair);

    return await this.server.sendTransaction(assembled);
  }

  private async transactionFromOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string
  ) {
    return new TransactionBuilder(await this.getAccount(sender), {
      fee: BASE_FEE,
      networkPassphrase: (await this.server.getNetwork()).passphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
  }

  async simulateOperation<T>(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string,
    transform: (sim: rpc.Api.SimulateTransactionSuccessResponse) => T
  ) {
    const tx = await this.transactionFromOperation(operation, sender);

    return transform(await this.simulateTransaction(tx));
  }

  async getContractData<T>(
    contract: string | Address | Contract,
    key: xdr.ScVal,
    transform: (result: rpc.Api.LedgerEntryResult) => T,
    durability?: rpc.Durability
  ) {
    return transform(
      await this.server.getContractData(contract, key, durability)
    );
  }
}
