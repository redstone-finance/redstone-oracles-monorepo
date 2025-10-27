import {
  ContractUpdater,
  ok,
  TxDeliveryMan,
  TxDeliveryManUpdateStatus,
  unwrapSuccess,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Operation, xdr } from "@stellar/stellar-sdk";
import { StellarClient } from "./StellarClient";
import { StellarSigner } from "./StellarSigner";
import { StellarTransactionExecutor } from "./StellarTransactionExecutor";
import { configFromPartial, StellarTxDeliveryManConfig } from "./StellarTxDeliveryManConfig";

type StellarOperation = xdr.Operation<Operation.InvokeHostFunction>;

export class StellarOperationSender {
  private readonly executor: StellarTransactionExecutor;
  private readonly txDeliveryMan: TxDeliveryMan;

  constructor(
    signer: StellarSigner,
    client: StellarClient,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    const fullConfig = configFromPartial(config);
    this.txDeliveryMan = new TxDeliveryMan(fullConfig, "stellar-tx-delivery-man");
    this.executor = new StellarTransactionExecutor(
      signer,
      client,
      fullConfig.gasLimit,
      fullConfig.expectedTxDeliveryTimeInMs
    );
  }

  getExecutor() {
    return this.executor;
  }

  async updateContract(
    updater: ContractUpdater,
    params: ContractParamsProvider
  ): Promise<TxDeliveryManUpdateStatus> {
    return await this.txDeliveryMan.updateContract(updater, params);
  }

  async sendTransaction(operation: StellarOperation): Promise<string> {
    const result = await this.txDeliveryMan.submit(async () => {
      const txResult = await this.executor.executeOperation(operation);

      return ok({ transactionHash: txResult.hash });
    });

    return unwrapSuccess(result).transactionHash;
  }

  async getPublicKey() {
    return await this.executor.getPublicKey();
  }
}
