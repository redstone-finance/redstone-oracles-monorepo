import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Operation, rpc, xdr } from "@stellar/stellar-sdk";
import { getLedgerCloseDate } from "../utils";
import { StellarClient } from "./StellarClient";
import { Signer, StellarSigner } from "./StellarSigner";
import {
  configFromPartial,
  StellarTxDeliveryManConfig,
  WAIT_BETWEEN_MS,
} from "./StellarTxDeliveryManConfig";

export type { StellarTxDeliveryManConfig } from "./StellarTxDeliveryManConfig";
type Tx = xdr.Operation<Operation.InvokeHostFunction>;
type TxCreator = () => Tx | Promise<Tx>;

const SLEEP_TIME_MS = 1_000;
const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn" | "maxRetries"> = {
  waitBetweenMs: SLEEP_TIME_MS,
};

export class StellarTxDeliveryMan {
  private readonly logger = loggerFactory("stellar-tx-delivery-man");
  private readonly config: StellarTxDeliveryManConfig;
  private readonly signer: StellarSigner;

  constructor(
    private readonly client: StellarClient,
    signer: Signer,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    this.config = configFromPartial(config);
    this.signer = new StellarSigner(signer);
  }

  async getPublicKey() {
    return await this.signer.publicKey();
  }

  async sendTransaction(txCreator: TxCreator) {
    let i = 0;

    try {
      const { hash, cost, baseFee } = await RedstoneCommon.retry({
        fn: async () => {
          void this.logNetworkStats(true);

          return await RedstoneCommon.timeoutOrResult(
            this.sendTransactionWithIteration(txCreator, i++),
            this.config.expectedTxDeliveryTimeInMS
          );
        },
        maxRetries: this.config.maxTxSendAttempts,
        logger: this.logger.warn.bind(this.logger),
      })();

      this.logger.log(
        `Sending transaction successful, hash: ${hash}, cost: ${cost} stroops, baseFee: ${baseFee} stroops`
      );
      void this.logNetworkStats(true);

      return hash;
    } catch (e) {
      this.logger.error(`Sending transaction failed ${this.config.maxTxSendAttempts} times`);
      void this.logNetworkStats(true);

      throw e;
    }
  }

  private async sendTransactionWithIteration(txCreator: TxCreator, iteration: number) {
    const tx = await txCreator();

    const multiplier = this.config.gasMultiplier ** iteration;
    const baseFee = BigInt(
      Math.round(Math.min(this.config.gasBase * multiplier, this.config.gasLimit))
    );

    this.logger.info(
      `Sending transaction; Attempt #${iteration + 1} (baseFee: ${baseFee} stroops)`
    );

    const transaction = await this.client.prepareSignedTransaction(
      tx,
      this.signer,
      baseFee.toString()
    );
    const response = await this.client.sendTransaction(transaction);
    const hash = response.hash;

    this.logger.info(
      `Transaction ${hash} sent with status ${response.status}; ` +
        `latestLedger: ${response.latestLedger} closed on ${getLedgerCloseDate(response.latestLedgerCloseTime).toISOString()}`
    );

    if (!["PENDING", "DUPLICATE"].includes(response.status)) {
      const { status, errorResult } = response;

      if (status === "TRY_AGAIN_LATER") {
        await RedstoneCommon.sleep(WAIT_BETWEEN_MS);
      }

      if (errorResult === undefined) {
        throw new Error(`Execute operation status: ${status}`);
      }

      const error = errorResult.result().switch().name;
      const cost = errorResult.feeCharged().toBigInt();
      throw new Error(
        `Execute operation status: ${status}, error: ${error}, cost: ${cost} stroops`
      );
    }

    this.logger.info(`Waiting for tx: ${hash}`);
    const { cost } = await this.waitForTx(hash, this.config.expectedTxDeliveryTimeInMS);

    return {
      hash,
      cost: cost.toBigInt(),
      baseFee,
    };
  }

  private async waitForTx(hash: string, timeout: number) {
    return await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () => {
        const response = await this.client.getTransaction(hash);
        if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return response;
        }

        throw new Error(`Transaction ${hash} ${response.status}`);
      },
      fnName: `waitForTx ${hash}`,
      maxRetries: timeout / SLEEP_TIME_MS,
    })();
  }

  private async logNetworkStats(force = false) {
    const stats = await this.client.getNetworkStats(force);
    this.logger.info(
      `Network utilization: ${stats?.ledger_capacity_usage} (ledger: ${stats?.last_ledger})`,
      stats
    );
  }
}
