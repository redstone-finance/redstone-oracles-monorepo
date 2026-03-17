import { IContractConnector } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { utils } from "ethers";
import { RadixClient } from "./RadixClient";

export class RadixContractConnector<Adapter> implements IContractConnector<Adapter> {
  private readonly logger = loggerFactory("radix-connector");

  constructor(
    protected client: RadixClient,
    protected componentId?: string
  ) {}

  getAdapter(): Promise<Adapter> {
    throw new Error("getAdapter is not implemented");
  }

  async getBlockNumber(): Promise<number> {
    return await this.client.getCurrentStateVersion();
  }

  async waitForTransaction(transactionId: string): Promise<boolean> {
    return await this.client.waitForCommit(transactionId);
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return utils.parseEther(await this.client.getXRDBalance(address, blockNumber)).toBigInt();
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }

  async transfer(toAddress: string, amount: number) {
    return await this.client.transfer(toAddress, amount);
  }

  async getSignerAddress() {
    return await this.client.getAccountAddress();
  }

  getTimeForBlock(_blockHeight: number) {
    this.logger.warn("getTimeForBlock is not supported for Radix");

    return Promise.resolve(new Date(0));
  }
}
