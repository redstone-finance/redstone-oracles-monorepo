import { BlockchainService, BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { SolanaClient } from "./client/SolanaClient";

export class SolanaBlockchainService implements BlockchainService {
  constructor(protected readonly client: SolanaClient) {}

  async getBalance(addressOrName: string, slot?: number): Promise<bigint> {
    return await this.getNormalizedBalance(addressOrName, slot);
  }

  async getBlockNumber(): Promise<number> {
    return await this.client.getSlot("finalized");
  }

  async waitForTransaction(_txId: string): Promise<boolean> {
    return await Promise.resolve(true);
  }

  async getNormalizedBalance(address: string, slot?: number): Promise<bigint> {
    const balance = await this.client.getBalance(new PublicKey(address), slot);

    return BigInt(balance) * (BigInt(10 ** 18) / BigInt(LAMPORTS_PER_SOL));
  }
}

export class SolanaBlockchainServiceWithTransfer
  extends SolanaBlockchainService
  implements BlockchainServiceWithTransfer
{
  constructor(
    client: SolanaClient,
    private readonly keypair: Keypair
  ) {
    super(client);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.keypair.publicKey.toBase58());
  }

  async transfer(toAddress: string, amount: number): Promise<void> {
    return await this.client.transfer(this.keypair, toAddress, amount);
  }
}
