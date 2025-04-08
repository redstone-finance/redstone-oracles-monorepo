import { IContractConnector } from "@redstone-finance/sdk";
import { BigNumber } from "ethers";
import { IBlockchainService } from "./IBlockchainService";

export abstract class NonEvmBlockchainService implements IBlockchainService {
  protected constructor(private connector: IContractConnector<unknown>) {}

  async getBalance(
    addressOrName: string,
    blockTag?: number
  ): Promise<BigNumber> {
    if (!this.connector.getNormalizedBalance) {
      throw new Error("Method not implemented.");
    }
    return BigNumber.from(
      await this.connector.getNormalizedBalance(addressOrName, blockTag)
    );
  }

  async transfer(toAddress: string, amount: number) {
    if (!this.connector.transfer) {
      throw new Error("Method not implemented.");
    }
    await this.connector.transfer(toAddress, amount);
  }

  getSignerAddress(): Promise<string> {
    if (!this.connector.getSignerAddress) {
      throw new Error("Method not implemented.");
    }
    return this.connector.getSignerAddress();
  }

  getBlockNumber(): Promise<number> {
    return this.connector.getBlockNumber();
  }

  abstract getTimeForBlock(blockHeight: number): Promise<Date>;
}
