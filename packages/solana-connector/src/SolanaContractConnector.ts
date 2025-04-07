import {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { SolanaPricesContractAdapter } from "./price_adapter/SolanaPricesContractAdapter";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
  private adapter?: SolanaPricesContractAdapter;

  constructor(
    private readonly connection: Connection,
    private readonly address: string,
    private readonly keypair?: Keypair
  ) {}

  getAdapter(): Promise<SolanaPricesContractAdapter> {
    if (!this.adapter) {
      const contract = PriceAdapterContract.createMultiContract(
        this.connection,
        this.address,
        this.keypair
      );
      this.adapter = new SolanaPricesContractAdapter(contract);
    }

    return Promise.resolve(this.adapter);
  }

  getBlockNumber(): Promise<number> {
    return this.connection.getBlockHeight();
  }

  waitForTransaction(_txId: string): Promise<boolean> {
    return Promise.resolve(true);
  }
}
