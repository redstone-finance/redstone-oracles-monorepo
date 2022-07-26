import _ from "lodash";
import { PricesObj } from "../../types";
import { getRequiredPropValue } from "../../utils/objects";
import { BaseFetcher } from "../BaseFetcher";
import YahooFinanceProxy from "./YahooFinanceProxy";
import symbolToId from "./yf-symbol-to-id.json";

const idToSymbol = _.invert(symbolToId);

export class YfUnofficialFetcher extends BaseFetcher {
  private yahooFinanceProxy: YahooFinanceProxy;

  constructor() {
    super("yf-unofficial");
    this.yahooFinanceProxy = new YahooFinanceProxy();
  }

  override convertIdToSymbol(id: string) {
    return getRequiredPropValue(idToSymbol, id);
  }

  override convertSymbolToId(symbol: string) {
    return getRequiredPropValue(symbolToId, symbol);
  }

  async fetchData(ids: string[]) {
    return await this.yahooFinanceProxy.getExchangeRates(ids);
  }

  async extractPrices(response: any): Promise<PricesObj> {
    const pricesObj: { [symbol: string]: number } = {};

    for (const symbol of Object.keys(response)) {
      const details = response[symbol];

      let value: any = details.price.regularMarketPrice;
      if (isNaN(value)) {
        if (!!value && value.raw) {
          value = value.raw;
        } else {
          this.logger.warn(
            `Empty regular market price: ${JSON.stringify(details.price)}`
          );
        }
      }

      pricesObj[symbol] = value;
    }

    return pricesObj;
  }
}
