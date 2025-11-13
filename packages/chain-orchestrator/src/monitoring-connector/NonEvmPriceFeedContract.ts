import {
  IContractConnector,
  IPriceFeedContract,
  IPriceFeedContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumber } from "ethers";

export class NonEvmPriceFeedContract implements IPriceFeedContract {
  private constructor(private readonly adapter: IPriceFeedContractAdapter) {}

  static async createWithConnector(connector: IContractConnector<IPriceFeedContractAdapter>) {
    return new NonEvmPriceFeedContract(await connector.getAdapter());
  }

  async decimals(blockTag?: number) {
    return await this.adapter.decimals?.(blockTag);
  }

  async latestAnswer(blockTag?: number) {
    return BigNumber.from((await this.adapter.getPriceAndTimestamp(blockTag)).value).toBigInt();
  }
}
