import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import type { IContractConnector } from "@redstone-finance/sdk";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";
import { SuiConfig } from "./config";

export class SuiContractConnector<Adapter> implements IContractConnector<Adapter> {
  static txDeliveryManCache: { [p: string]: SuiTxDeliveryMan | undefined } = {};

  constructor(
    protected readonly client: SuiClient,
    protected readonly keypair?: Keypair
  ) {}

  /// TODO: Broken ISP leads to forced error throwing here
  /// The method shouldn't be be used for non-specified ContractConnectors
  getAdapter(): Promise<Adapter> {
    throw new Error("getAdapter is not implemented");
  }

  async getBlockNumber(): Promise<number> {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  async getNormalizedBalance(address: string): Promise<bigint> {
    return (
      BigInt((await this.client.getBalance({ owner: address })).totalBalance) *
      (10n ** 18n / MIST_PER_SUI)
    );
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    await this.client.waitForTransaction({ digest: txId });
    const response = await this.client.getTransactionBlock({
      digest: txId,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return SuiTxDeliveryMan.getStatus(response).success;
  }

  protected static getCachedDeliveryMan(client: SuiClient, keypair: Keypair, config: SuiConfig) {
    const cacheKey = keypair.getPublicKey().toSuiPublicKey();
    SuiContractConnector.txDeliveryManCache[cacheKey] ??= new SuiTxDeliveryMan(
      client,
      keypair,
      config
    );

    return SuiContractConnector.txDeliveryManCache[cacheKey];
  }

  async transfer(toAddress: string, amount: number) {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    amount = amount * 10 ** 9;

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], toAddress);

    await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });
  }

  getSignerAddress() {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    return Promise.resolve(this.keypair.getPublicKey().toSuiAddress());
  }
}
