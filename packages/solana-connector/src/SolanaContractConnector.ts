import { IContractConnector, IPricesContractAdapter } from "@redstone-finance/sdk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { AnchorReadonlyProvider } from "./client/AnchorReadonlyProvider";
import { SolanaClient } from "./client/SolanaClient";
import { SolanaContractUpdater } from "./client/SolanaContractUpdater";
import { DEFAULT_SOLANA_CONFIG } from "./config";
import { PriceAdapterContract } from "./price_adapter/PriceAdapterContract";
import { SolanaPricesContractAdapter } from "./price_adapter/SolanaPricesContractAdapter";

export class SolanaContractConnector implements IContractConnector<IPricesContractAdapter> {
  private adapter?: SolanaPricesContractAdapter;

  constructor(
    private readonly connection: Connection,
    private readonly address?: string,
    private readonly keypair?: Keypair,
    private readonly config = DEFAULT_SOLANA_CONFIG
  ) {}

  getAdapter(): Promise<SolanaPricesContractAdapter> {
    if (!this.address) {
      throw new Error("Adapter address not set");
    }
    if (!this.adapter) {
      const client = SolanaClient.createMultiClient(this.connection);
      const provider = new AnchorReadonlyProvider(this.connection, client, this.keypair?.publicKey);
      const contract = new PriceAdapterContract(this.address, provider, client);

      const contractUpdater = this.keypair
        ? new SolanaContractUpdater(client, this.config, this.keypair, contract)
        : undefined;

      this.adapter = new SolanaPricesContractAdapter(contract, contractUpdater);
    }

    return Promise.resolve(this.adapter);
  }

  getBlockNumber(): Promise<number> {
    return this.connection.getSlot("finalized");
  }

  waitForTransaction(_txId: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  async getNormalizedBalance(address: string, slot?: number) {
    const balance = await this.connection.getBalance(new PublicKey(address), {
      minContextSlot: slot,
    });

    return BigInt(balance) * (BigInt(10 ** 18) / BigInt(LAMPORTS_PER_SOL));
  }

  async transfer(toAddress: string, amountInSol: number) {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    amountInSol *= LAMPORTS_PER_SOL;
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amountInSol,
      })
    );

    await sendAndConfirmTransaction(this.connection, transaction, [this.keypair]);
  }

  getSignerAddress() {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    return Promise.resolve(this.keypair.publicKey.toBase58());
  }
}
