import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { Contract, ProviderInterface } from "starknet";
import { extractNumbers } from "../starknet-utils";
import price_feed_abi from "./price_feed_abi.json";

export class PriceFeedStarknetContractAdapter implements PriceFeedAdapter {
  private readonly contract: Contract;

  constructor(provider: ProviderInterface, contractAddress: string) {
    this.contract = new Contract(price_feed_abi, contractAddress, provider);
  }

  async getPriceAndTimestamp() {
    const response = await this.contract.call("read_price_and_timestamp");
    const values = extractNumbers(Object.values(response));

    return {
      value: values[0],
      timestamp: Number(values[1]),
    };
  }

  getDecimals() {
    return Promise.resolve(undefined);
  }

  getDescription() {
    return Promise.resolve(undefined);
  }

  getDataFeedId() {
    return Promise.resolve(undefined);
  }
}
