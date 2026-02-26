import type { Keypair } from "@mysten/sui/cryptography";
import { SuiTransactionBlockResponseOptions } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import type {
  BlockchainService,
  BlockchainServiceWithTransfer,
} from "@redstone-finance/multichain-kit";
import type { SuiClient } from "./SuiClient";

export class SuiBlockchainService implements BlockchainService {
  constructor(protected readonly client: SuiClient) {}

  async getBlockNumber(): Promise<number> {
    return await this.client.getBlockNumber();
  }

  async getNormalizedBalance(address: string): Promise<bigint> {
    const balance = await this.client.getBalance(address);

    return balance * (10n ** 18n / MIST_PER_SUI);
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    return await this.client.waitForTransaction(txId);
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }

  getTimeForBlock(block: number): Promise<Date> {
    return this.client.getTimeForBlock(block);
  }

  queryTransactionBlocks(
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ) {
    return this.client.queryTransactionBlocks(objectId, cursor, options);
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

  async transfer(toAddress: string, amount: number): Promise<void> {
    amount = amount * 10 ** 9;

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], toAddress);

    const result = await this.client.signAndExecute(tx, this.keypair);
    const txData = result.Transaction ?? result.FailedTransaction;

    await this.client.waitForTransaction(txData.digest);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.keypair.toSuiAddress());
  }
}
