import { BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";

export abstract class NonEvmBlockchainServiceWithTransfer implements BlockchainServiceWithTransfer {
  protected constructor(private service: BlockchainServiceWithTransfer) {}

  async transfer(toAddress: string, amount: number) {
    return await this.service.transfer(toAddress, amount);
  }

  async getSignerAddress() {
    return await this.service.getSignerAddress();
  }

  async getBlockNumber() {
    return await this.service.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.service.waitForTransaction(txId);
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return await this.service.getNormalizedBalance(address, blockNumber);
  }

  async getBalance(addressOrName: string, blockTag?: number) {
    return await this.service.getNormalizedBalance(addressOrName, blockTag);
  }

  abstract getTimeForBlock(blockHeight: number): Promise<Date>;
}
