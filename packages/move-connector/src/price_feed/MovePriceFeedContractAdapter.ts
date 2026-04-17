import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { BigNumber } from "ethers";
import { MoveClient } from "../MoveClient";
import { MoveContractViewer } from "../MoveContractViewer";

export class MovePriceFeedContractAdapter extends MoveContractViewer implements PriceFeedAdapter {
  constructor(client: MoveClient, packageAddress: string) {
    super(client, "price_feed", packageAddress);
  }

  async getPriceAndTimestamp() {
    const result = await this.viewOnChain("read_price_and_timestamp");

    return {
      value: BigNumber.from(result[0]).toBigInt(),
      timestamp: Number(result[1]),
    };
  }

  async getDataFeedId() {
    const result = await this.viewOnChain("get_data_feed_id");

    return (result[0] as string).replace(/\0+$/, "");
  }

  async getDescription() {
    const result = await this.viewOnChain("description");

    return result[0] as string;
  }

  getDecimals() {
    return Promise.resolve(undefined);
  }
}
