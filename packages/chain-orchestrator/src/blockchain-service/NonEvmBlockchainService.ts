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

  getBlockNumber(): Promise<number> {
    return this.connector.getBlockNumber();
  }

  abstract getTimeForBlock(blockHeight: number): Promise<Date>;
}
