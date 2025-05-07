import {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { SolanaTxDeliveryMan } from "./client/SolanaTxDeliveryMan";
import { DEFAULT_SOLANA_CONFIG } from "./config";
import { PriceAdapterContract } from "./price_adapter/PriceAdapterContract";
import { SolanaPricesContractAdapter } from "./price_adapter/SolanaPricesContractAdapter";

export class SolanaContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
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
      const contract = PriceAdapterContract.createMultiContract(
        this.connection,
        this.address,
        this.keypair?.publicKey
      );

      const txDeliveryMan = this.keypair
        ? new SolanaTxDeliveryMan(this.connection, this.keypair, this.config)
        : undefined;

      this.adapter = new SolanaPricesContractAdapter(contract, txDeliveryMan);
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
    return BigInt(balance) * BigInt(10 ** 9);
  }

  async transfer(toAddress: string, amountInSol: number) {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    amountInSol = amountInSol * 10 ** 9;
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amountInSol,
      })
    );

    await sendAndConfirmTransaction(this.connection, transaction, [
      this.keypair,
    ]);
  }

  getSignerAddress() {
    if (!this.keypair) {
      throw new Error("Private Key was not provided.");
    }
    return Promise.resolve(this.keypair.publicKey.toBase58());
  }
}
