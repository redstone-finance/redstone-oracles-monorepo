import { BlockchainService } from "@redstone-finance/multichain-kit";
import { providers } from "ethers";

export class EvmBlockchainService implements BlockchainService {
  constructor(private readonly provider: providers.Provider) {}

  async getBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  async getTimeForBlock(block: number): Promise<Date> {
    const blockData = await this.provider.getBlockWithTransactions(block);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- add reason here, please
    return new Date((blockData?.timestamp || 0) * 1000);
  }

  async getReceiptForTransaction(tx: { hash?: string }): Promise<providers.TransactionReceipt> {
    return await this.provider.getTransactionReceipt(tx.hash!);
  }

  async getBlockWithTransactions(blockNumber: number) {
    return await this.provider.getBlockWithTransactions(blockNumber);
  }

  async getBalance(addressOrName: string, blockTag?: number) {
    return (await this.provider.getBalance(addressOrName, blockTag)).toBigInt();
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return await this.getBalance(address, blockNumber);
  }
}
