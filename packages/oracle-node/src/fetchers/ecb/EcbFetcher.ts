import * as exchangeRates from "ecb-euro-exchange-rates";
import { PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";

export class EcbFetcher extends BaseFetcher {
  constructor() {
    super("ecb");
  }

  async fetchData(): Promise<any> {
    return await exchangeRates.fetch();
  }

  async extractPrices(response: any, ids: string[]): Promise<PricesObj> {
    const pricesObj: { [symbol: string]: number } = {};

    const { rates } = response;
    const usdRate = rates.USD;
    for (const id of ids) {
      if (id === "EUR") {
        pricesObj[id] = usdRate;
      } else {
        pricesObj[id] = (1 / rates[id]) * usdRate;
      }
    }

    return pricesObj;
  }
}
