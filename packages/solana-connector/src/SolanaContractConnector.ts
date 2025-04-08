import {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DEFAULT_SOLANA_CONFIG } from "./config";
import { PriceAdapterContract } from "./price_adapter/PriceAdapterContract";
import { SolanaPricesContractAdapter } from "./price_adapter/SolanaPricesContractAdapter";
import { SolanaTxDeliveryMan } from "./SolanaTxDeliveryMan";

export class SolanaContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
  private adapter?: SolanaPricesContractAdapter;

  constructor(
    private readonly connection: Connection,
    private readonly address?: string,
    private readonly keypair?: Keypair
  ) {}

  getAdapter(): Promise<SolanaPricesContractAdapter> {
    if (!this.address) {
      throw new Error("Adapter address not set");
    }
    if (!this.adapter) {
      const contract = PriceAdapterContract.createMultiContract(
        this.connection,
        this.address,
        this.keypair?.publicKey
      );

      const txDeliveryMan = this.keypair
        ? SolanaTxDeliveryMan.createMultiTxDeliveryMan(
            this.connection,
            this.keypair,
            DEFAULT_SOLANA_CONFIG
          )
        : undefined;

      this.adapter = new SolanaPricesContractAdapter(contract, txDeliveryMan);
    }

    return Promise.resolve(this.adapter);
  }

  getBlockNumber(): Promise<number> {
    return this.connection.getBlockHeight();
  }

  waitForTransaction(_txId: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  async getNormalizedBalance(address: string, _blockNumber?: number) {
    const balance = await this.connection.getBalance(new PublicKey(address));
    return BigInt(balance) * BigInt(10 ** 9);
  }
}
