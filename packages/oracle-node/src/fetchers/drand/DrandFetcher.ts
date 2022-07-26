import axios from "axios";
import { PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";

const DRAND_URL = "https://drand.cloudflare.com/public/latest";
const MAX_ENTROPY_VALUE = 10000000;
export const ENTROPY_SYMBOL = "ENTROPY";

export class DrandFetcher extends BaseFetcher {
  constructor() {
    super("drand");
  }

  async fetchData() {
    return await axios.get(DRAND_URL);
  }

  async extractPrices(response: any, symbols: string[]): Promise<PricesObj> {
    if (symbols.length !== 1 || symbols[0] !== ENTROPY_SYMBOL) {
      throw new Error(`Only one symbol supported by drand: ${ENTROPY_SYMBOL}`);
    }

    const entropy = JSON.parse(
      Number(
        BigInt("0x" + response.data.randomness) % BigInt(MAX_ENTROPY_VALUE)
      ).toString()
    );

    const result = {
      [ENTROPY_SYMBOL]: entropy,
    };

    return result;
  }
}
