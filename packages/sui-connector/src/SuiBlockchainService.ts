import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import type {
  BlockchainServiceWithTransfer,
  BlockchainServiceWithTxLookup,
  TxLookup,
} from "@redstone-finance/multichain-kit";
import { signExecuteAndWait } from "./client/sign-execute-and-wait";
import type { SuiClient } from "./client/SuiClient";
import { suiToMist } from "./util";

export class SuiBlockchainService implements BlockchainServiceWithTxLookup {
  constructor(protected readonly client: SuiClient) {}

  get txLookup(): TxLookup {
    return this.client.txLookup;
  }

  async getBlockNumber(): Promise<number> {
    return await this.client.getBlockNumber();
  }

  async getNormalizedBalance(address: string): Promise<bigint> {
    const balance = await this.client.getBalance(address);

    return balance * (10n ** 18n / MIST_PER_SUI);
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }

  getTimeForBlock(block: number): Promise<Date> {
    return this.client.getTimeForBlock(block);
  }
}

export class SuiBlockchainServiceWithTransfer
  extends SuiBlockchainService
  implements BlockchainServiceWithTransfer
{
  constructor(
    client: SuiClient,
    private readonly keypair: Keypair
  ) {
    super(client);
  }

  async transfer(toAddress: string, amount: number) {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiToMist(amount))]);
    tx.transferObjects([coin], toAddress);

    await signExecuteAndWait(this.client, tx, this.keypair);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.keypair.toSuiAddress());
  }
}
