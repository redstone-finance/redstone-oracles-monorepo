import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Operation, rpc, xdr } from "@stellar/stellar-sdk";
import { getLedgerCloseDate } from "../utils";
import { StellarClient } from "./StellarClient";
import { StellarSigner } from "./StellarSigner";

const SLEEP_TIME_MS = 1_000;

type StellarOperation = xdr.Operation<Operation.InvokeHostFunction>;

export class StellarTransactionExecutor {
  private readonly logger = loggerFactory("stellar-transaction-executor");

  constructor(
    private readonly signer: StellarSigner,
    private readonly client: StellarClient,
    private readonly gasLimit: number,
    private readonly confirmationTimeoutMs: number
  ) {}

  async executeOperation(operation: StellarOperation) {
    void this.logNetworkStats();

    const transaction = await this.client.prepareSignedTransaction(
      operation,
      this.signer,
      this.gasLimit.toString()
    );
    const response = await this.client.sendTransaction(transaction);

    this.logger.info(
      `Transaction ${response.hash} sent with status ${response.status}, ` +
        `latestLedger: ${response.latestLedger} closed on ${getLedgerCloseDate(response.latestLedgerCloseTime).toISOString()}`
    );

    this.validateTransactionResponse(response);

    this.logger.info(`Waiting for transaction: ${response.hash}`);
    const confirmedTx = await this.waitForConfirmation(response.hash);

    const result = {
      hash: response.hash,
      cost: confirmedTx.cost.toBigInt(),
      baseFee: this.gasLimit,
    };

    this.logger.log(
      `Transaction successful: ${result.hash}, cost: ${result.cost} stroops, baseFee: ${result.baseFee} stroops`
    );
    void this.logNetworkStats();

    return result;
  }

  async getPublicKey() {
    return await this.signer.publicKey();
  }

  private validateTransactionResponse(response: rpc.Api.SendTransactionResponse) {
    if (["PENDING", "DUPLICATE"].includes(response.status)) {
      return;
    }

    void this.logNetworkStats();

    if (!response.errorResult) {
      throw new Error(`Transaction failed with status: ${response.status}`);
    }

    const error = response.errorResult.result().switch().name;
    const cost = response.errorResult.feeCharged().toBigInt();

    throw new Error(
      `Transaction failed: ${response.status}, error: ${error}, cost: ${cost} stroops`
    );
  }

  private async waitForConfirmation(hash: string) {
    const maxRetries = Math.max(1, Math.floor(this.confirmationTimeoutMs / SLEEP_TIME_MS));

    return await RedstoneCommon.retry({
      fn: async () => {
        const response = await this.client.getTransaction(hash);

        if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return response;
        }

        throw new Error(`Transaction ${hash} status: ${response.status}`);
      },
      fnName: `waitForConfirmation ${hash}`,
      maxRetries,
      waitBetweenMs: SLEEP_TIME_MS,
    })();
  }

  private async logNetworkStats() {
    const stats = await this.client.getNetworkStats(true);

    this.logger.info(
      `Network utilization: ${stats?.ledger_capacity_usage} (ledger: ${stats?.last_ledger})`,
      stats
    );
  }
}
