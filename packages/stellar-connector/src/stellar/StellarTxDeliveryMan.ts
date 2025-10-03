import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Operation, xdr } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { Signer, StellarSigner } from "./StellarSigner";
import {
  configFromPartial,
  StellarTxDeliveryManConfig,
  WAIT_BETWEEN_MS,
} from "./StellarTxDeliveryManConfig";

export type { StellarTxDeliveryManConfig } from "./StellarTxDeliveryManConfig";

type Tx = xdr.Operation<Operation.InvokeHostFunction>;
type TxCreator = () => Tx | Promise<Tx>;

export class StellarTxDeliveryMan {
  private readonly logger = loggerFactory("stellar-tx-delivery-man");
  private readonly config: StellarTxDeliveryManConfig;
  private readonly signer: StellarSigner;

  constructor(
    private readonly rpcClient: StellarRpcClient,
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
      const { hash, cost, fee } = await RedstoneCommon.retry({
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

      this.logger.info(
        `Sending transaction successful, hash: ${hash}, cost: ${cost} stroops, fee: ${fee} stroops`
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
    const fee = BigInt(
      Math.round(Math.min(this.config.gasBase * multiplier, this.config.gasLimit))
    );

    this.logger.info(`Sending transaction; Attempt #${iteration + 1} (fee: ${fee} stroops)`);

    const submitResponse = await this.rpcClient.executeOperation(tx, this.signer, fee.toString());

    if (!["PENDING", "DUPLICATE"].includes(submitResponse.status)) {
      const { status, errorResult } = submitResponse;

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

    this.logger.info(`Waiting for tx: ${submitResponse.hash}`);
    const { cost } = await this.rpcClient.waitForTx(submitResponse.hash);

    return {
      hash: submitResponse.hash,
      cost: cost.toBigInt(),
      fee,
    };
  }

  private async logNetworkStats(force = false) {
    const stats = await this.rpcClient.getNetworkStats(force);
    this.logger.info(
      `Network utilization: ${stats?.ledger_capacity_usage} (ledger: ${stats?.last_ledger})`,
      stats
    );
  }
}
