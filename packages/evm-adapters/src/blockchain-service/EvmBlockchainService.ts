import { BlockchainServiceWithTxLookup } from "@redstone-finance/multichain-kit";
import { providers } from "ethers";
import { EvmTxLookup } from "./EvmTxLookup";
import { Multicall3Config } from "./extract-top-ups";

export class EvmBlockchainService implements BlockchainServiceWithTxLookup {
  constructor(
    private readonly provider: providers.Provider,
    private readonly multicall3?: Multicall3Config
  ) {}

  get txLookup() {
    return new EvmTxLookup(this.provider, this.multicall3);
  }

  async getBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  async getTimeForBlock(block: number): Promise<Date> {
    const blockData = await this.provider.getBlockWithTransactions(block);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- some providers return null for not-yet-finalized blocks; treat as epoch
    return new Date((blockData?.timestamp || 0) * 1000);
  }

  async getReceiptForTransaction(tx: { hash?: string }) {
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
