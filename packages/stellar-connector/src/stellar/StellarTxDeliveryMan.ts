import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { BASE_FEE, Keypair, Operation, xdr } from "@stellar/stellar-sdk";
import { StellarConfig } from "../config";
import { StellarRpcClient } from "../stellar/StellarRpcClient";

type Tx = xdr.Operation<Operation.InvokeHostFunction>;
type TxCreator = () => Tx | Promise<Tx>;

export class StellarTxDeliveryMan {
  private readonly logger = loggerFactory("stellar-tx-delivery-man");

  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly keypair: Keypair,
    private readonly config: StellarConfig["txDeliveryMan"]
  ) {}

  getPublicKey() {
    return this.keypair.publicKey();
  }

  async sendTransaction(txCreator: TxCreator) {
    let i = 0;

    try {
      const { hash, fee } = await RedstoneCommon.retry({
        fn: async () => {
          return await RedstoneCommon.timeout(
            this.sendTransactionWithIteration(txCreator, i++),
            this.config.timeoutMs
          );
        },
        ...this.config.retry,
        logger: this.logger.warn,
      })();

      this.logger.info(
        `Sending transaction successful, hash: ${hash}, fee: ${fee} stroops`
      );

      return hash;
    } catch (e) {
      this.logger.error(
        `Sending transaction failed ${this.config.retry.maxRetries} times`
      );
      throw e;
    }
  }

  private async sendTransactionWithIteration(
    txCreator: TxCreator,
    iteration: number
  ) {
    const tx = await txCreator();

    const multiplier = BigInt(this.config.feeMultiplier) ** BigInt(iteration);
    let fee = BigInt(BASE_FEE) * multiplier;
    if (fee > this.config.feeLimit) {
      fee = this.config.feeLimit;
    }

    this.logger.info(
      `Sending transaction; Attempt #${iteration + 1} (fee: ${fee} stroops)`
    );

    const submitResponse = await this.rpcClient.executeOperation(
      tx,
      this.keypair,
      fee.toString()
    );

    if (!["PENDING", "DUPLICATE"].includes(submitResponse.status)) {
      throw new Error(`Execute operation status: ${submitResponse.status}`);
    }

    await this.rpcClient.waitForTx(submitResponse.hash);

    return {
      hash: submitResponse.hash,
      fee,
    };
  }
}
