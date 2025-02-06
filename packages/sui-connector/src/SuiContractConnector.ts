import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import type { IContractConnector } from "@redstone-finance/sdk";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";

export class SuiContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  static txDeliveryManCache: { [p: string]: SuiTxDeliveryMan | undefined } = {};

  constructor(protected readonly client: SuiClient) {}

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
      },
    });

    return SuiTxDeliveryMan.getSuccess(response).success;
  }

  protected static getCachedDeliveryMan(client: SuiClient, keypair: Keypair) {
    const cacheKey = keypair.getPublicKey().toSuiPublicKey();
    SuiContractConnector.txDeliveryManCache[cacheKey] ??= new SuiTxDeliveryMan(
      client,
      keypair
    );

    return SuiContractConnector.txDeliveryManCache[cacheKey];
  }
}
