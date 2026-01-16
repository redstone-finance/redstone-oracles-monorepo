import {
  ContractUpdater,
  MultiTxDeliveryMan,
  TxDeliveryMan,
  TxDeliveryManUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { Operation, xdr } from "@stellar/stellar-sdk";
import { MULTI_TX_DELIVERY_MAN_CONFIG } from "../split-params-into-batches";
import { StellarClient } from "./StellarClient";
import { StellarSigner } from "./StellarSigner";
import { StellarTransactionExecutor } from "./StellarTransactionExecutor";
import { configFromPartial, StellarTxDeliveryManConfig } from "./StellarTxDeliveryManConfig";

export type StellarOperation = xdr.Operation<Operation.InvokeHostFunction>;

export class StellarOperationSender {
  private readonly executor: StellarTransactionExecutor;
  private readonly txDeliveryMan: TxDeliveryMan;

  constructor(
    public signer: StellarSigner,
    client: StellarClient,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    const fullConfig = configFromPartial(config);
    this.txDeliveryMan = new MultiTxDeliveryMan(
      {
        ...fullConfig,
        ...MULTI_TX_DELIVERY_MAN_CONFIG,
      },
      "stellar-tx-delivery-man"
    );
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
    const context = {};
    const operationResult = await FP.tryCallAsyncStringifyError(() =>
      this.txDeliveryMan.submit(async () => {
        const txResult = await this.executor.executeOperation(operation, context);

        return FP.ok({ transactionHash: txResult.hash });
      })
    );

    const operationResultFlatten = FP.flatten(
      FP.mapErr(operationResult, (err) => [RedstoneCommon.stringify(err)])
    );
    const hashResult = FP.map(operationResultFlatten, (r) => r.transactionHash);

    return FP.unwrapSuccess(hashResult);
  }

  async getPublicKey() {
    return await this.executor.getPublicKey();
  }
}
