import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { BASE_FEE, Keypair, Operation, xdr } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
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

  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly keypair: Keypair,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    this.config = configFromPartial(config);
  }

  getPublicKey() {
    return this.keypair.publicKey();
  }

  async sendTransaction(txCreator: TxCreator) {
    let i = 0;

    try {
      const { hash, fee } = await RedstoneCommon.retry({
        fn: async () => {
          return await RedstoneCommon.timeoutOrResult(
            this.sendTransactionWithIteration(txCreator, i++),
            this.config.expectedTxDeliveryTimeInMS
          );
        },
        maxRetries: this.config.maxTxSendAttempts,
        logger: this.logger.warn,
      })();

      this.logger.info(
        `Sending transaction successful, hash: ${hash}, fee: ${fee} stroops`
      );

      return hash;
    } catch (e) {
      this.logger.error(
        `Sending transaction failed ${this.config.maxTxSendAttempts} times`
      );
      throw e;
    }
  }

  private async sendTransactionWithIteration(
    txCreator: TxCreator,
    iteration: number
  ) {
    const tx = await txCreator();

    const multiplier = this.config.gasMultiplier ** iteration;
    const fee = BigInt(
      Math.round(Math.min(Number(BASE_FEE) * multiplier, this.config.gasLimit))
    );

    this.logger.info(
      `Sending transaction; Attempt #${iteration + 1} (fee: ${fee} stroops)`
    );

    const submitResponse = await this.rpcClient.executeOperation(
      tx,
      this.keypair,
      fee.toString()
    );

    if (!["PENDING", "DUPLICATE"].includes(submitResponse.status)) {
      if (submitResponse.status === "TRY_AGAIN_LATER") {
        await RedstoneCommon.sleep(WAIT_BETWEEN_MS);
      }
      throw new Error(`Execute operation status: ${submitResponse.status}`);
    }

    await this.rpcClient.waitForTx(submitResponse.hash);

    return {
      hash: submitResponse.hash,
      fee,
    };
  }
}
