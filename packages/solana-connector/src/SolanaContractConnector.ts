import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
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
      const contract = new PriceAdapterContract(
        new AnchorProvider(
          this.connection,
          this.keypair ? new Wallet(this.keypair) : Wallet.local()
        ),
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

  async waitForTransaction(txId: string): Promise<boolean> {
    const latestBlockHash = await this.connection.getLatestBlockhash();

    const x = await this.connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txId,
      },
      "confirmed"
    );

    return x.value.err === null;
  }
}
