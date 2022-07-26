import { FetcherOpts, PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";
import axios from "axios";

const TWELVE_DATA_RATE_URL =
  "https://twelve-data1.p.rapidapi.com/exchange_rate";

export class TwelveDataFetcher extends BaseFetcher {
  constructor() {
    super("twelve-data");
  }

  override convertIdToSymbol(id: string): string {
    const [symbol] = id.split("/");
    return symbol;
  }

  override convertSymbolToId(symbol: string): string {
    return `${symbol}/USD`;
  }

  async fetchData(ids: string[], opts: FetcherOpts): Promise<any> {
    const symbolString = ids.join(",");
    return await axios.get(`${TWELVE_DATA_RATE_URL}?symbol=${symbolString}`, {
      headers: {
        "RapidAPI-Key": opts.credentials.twelveDataRapidApiKey,
      },
    });
  }

  async extractPrices(result: any, testing: any): Promise<PricesObj> {
    const pricesObj: { [id: string]: number } = {};

    const rates = result.data;
    for (const symbol of Object.keys(rates)) {
      const id = rates[symbol].symbol;
      pricesObj[id] = rates[symbol].rate;
    }

    return pricesObj;
  }
}
