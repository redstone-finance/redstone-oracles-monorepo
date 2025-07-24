import { Aptos } from "@aptos-labs/ts-sdk";
import {
  IPriceFeedContractAdapter,
  PriceAndTimestamp,
} from "@redstone-finance/sdk";
import { BigNumber } from "ethers";
import { MoveContractViewer } from "../MoveContractViewer";

export class MovePriceFeedContractAdapter
  extends MoveContractViewer
  implements IPriceFeedContractAdapter
{
  constructor(client: Aptos, packageAddress: string) {
    super(client, "price_feed", packageAddress);
  }

  async getPriceAndTimestamp() {
    const result = await this.viewOnChain("read_price_and_timestamp");

    return {
      value: BigNumber.from(result[0]),
      timestamp: Number(result[1]),
    } as PriceAndTimestamp;
  }

  async getDataFeedId() {
    const result = await this.viewOnChain("get_data_feed_id");

    return (result[0] as string).replace(/\0+$/, "");
  }

  async getDescription() {
    const result = await this.viewOnChain("description");

    return result[0] as string;
  }
}
