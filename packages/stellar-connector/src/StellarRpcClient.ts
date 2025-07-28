import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

const RETRY_COUNT = 10;
const SLEEP_TIME_MS = 1_000;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: RETRY_COUNT,
  waitBetweenMs: SLEEP_TIME_MS,
};

export class StellarRpcClient {
  private readonly logger = loggerFactory("stellar-price-connector");

  constructor(private readonly rpc: rpc.Server) {}

  async getAccount(publicKey: string): Promise<Account> {
    const accountResponse = await this.rpc.getAccount(publicKey);

    return new Account(
      accountResponse.accountId(),
      accountResponse.sequenceNumber()
    );
  }

  async waitForTx(hash: string) {
    return await RedstoneCommon.retry({
      fn: async () => {
        const response = await this.rpc.getTransaction(hash);
        if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return response;
        }
        throw new Error(
          `Transaction did not succedd: ${hash}, status: ${response.status}`
        );
      },
      ...RETRY_CONFIG,
    })();
  }

  async simulateTransaction(transaction: Transaction) {
    const sim = await this.rpc.simulateTransaction(transaction);

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

    return await this.rpc.sendTransaction(assembled);
  }

  async transactionFromOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string
  ) {
    return new TransactionBuilder(await this.getAccount(sender), {
      fee: BASE_FEE,
      networkPassphrase: (await this.rpc.getNetwork()).passphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
  }

  async simulateOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string
  ) {
    const tx = await this.transactionFromOperation(operation, sender);

    return await this.simulateTransaction(tx);
  }
}
