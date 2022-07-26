import _ from "lodash";
import { PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";
import CoingeckoProxy from "./CoingeckoProxy";
import { getRequiredPropValue } from "../../utils/objects";
import symbolToId from "./coingecko-symbol-to-id.json";

const idToSymbol = _.invert(symbolToId);

export class CoingeckoFetcher extends BaseFetcher {
  private coingeckoProxy: CoingeckoProxy;

  constructor() {
    super("coingecko");
    this.coingeckoProxy = new CoingeckoProxy();
  }

  override convertIdToSymbol(id: string) {
    return getRequiredPropValue(idToSymbol, id);
  }

  override convertSymbolToId(symbol: string) {
    return getRequiredPropValue(symbolToId, symbol);
  }

  async fetchData(ids: string[]): Promise<any> {
    return await this.coingeckoProxy.getExchangeRates(ids);
  }

  async extractPrices(response: any): Promise<PricesObj> {
    const pricesObj: { [id: string]: number } = {};

    const rates = response.data;
    for (const id of Object.keys(rates)) {
      pricesObj[id] = rates[id].usd;
    }

    return pricesObj;
  }
}
