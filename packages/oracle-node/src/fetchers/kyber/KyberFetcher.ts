import axios from "axios";
import redstone from "redstone-api";
import { PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";

const ETH_PAIRS_URL = "https://api.kyber.network/api/tokens/pairs";

export class KyberFetcher extends BaseFetcher {
  constructor() {
    super("kyber");
  }

  async fetchData() {
    return await axios.get(ETH_PAIRS_URL);
  }

  async extractPrices(response: any, ids: string[]): Promise<PricesObj> {
    const lastEthPrice = (await redstone.getPrice("ETH")).value;

    const pricesObj: PricesObj = {};

    const pairs = response.data;
    for (const id of ids) {
      const pair = pairs["ETH_" + id];
      if (pair !== undefined) {
        pricesObj[id] = lastEthPrice * pair.currentPrice;
      }
    }

    return pricesObj;
  }
}
