import { IPriceFeedContractAdapter, PriceAndTimestamp } from "@redstone-finance/sdk";
import { RadixClient } from "../../radix/RadixClient";
import { RadixContractAdapter, ReadMode } from "../../radix/RadixContractAdapter";
import { ReadDescriptionRadixMethod } from "./methods/ReadDescriptionRadixMethod";
import { ReadFeedIdRadixMethod } from "./methods/ReadFeedIdRadixMethod";
import { ReadPriceAndTimestampRadixMethod } from "./methods/ReadPriceAndTimestampRadixMethod";

export class PriceFeedRadixContractAdapter
  extends RadixContractAdapter
  implements IPriceFeedContractAdapter
{
  constructor(client: RadixClient, componentId: string, readMode: ReadMode = "CallReadMethod") {
    super(client, componentId, readMode);
  }

  async getPriceAndTimestamp(): Promise<PriceAndTimestamp> {
    return await this.client.call(new ReadPriceAndTimestampRadixMethod(this.componentId));
  }

  async getDescription() {
    return await this.client.call(new ReadDescriptionRadixMethod(this.componentId));
  }

  async getDataFeedId() {
    return await this.client.call(new ReadFeedIdRadixMethod(this.componentId));
  }
}
