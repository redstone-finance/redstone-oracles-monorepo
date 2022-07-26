import axios from "axios";
import { DataPackage, NumericDataPoint } from "redstone-protocol";
import { config } from "../../config";
import { PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";

const PRICES_URL = "https://api.redstone.finance/prices";
const MAX_LIMIT = 1000;

interface ShortPrice {
  timestamp: number;
  value: number;
}

export interface HistoricalPrice extends ShortPrice {
  symbol: string;
  signature: string;
  version: string;
}

interface ResponseForTwap {
  [symbol: string]: HistoricalPrice[];
}

export class TwapFetcher extends BaseFetcher {
  constructor(private readonly sourceProviderId: string) {
    super(`twap-${sourceProviderId}`);
  }

  async fetchData(ids: string[]) {
    const currentTimestamp = Date.now();
    const response: ResponseForTwap = {};

    // Fetching historical prices for each asset in parallel
    const promises: Promise<void>[] = [];
    for (const id of ids) {
      const { assetSymbol, millisecondsOffset } =
        TwapFetcher.parseTwapAssetId(id);
      const fromTimestamp = currentTimestamp - millisecondsOffset;
      const fetchingPromiseForSymbol = axios
        .get(PRICES_URL, {
          params: {
            symbol: assetSymbol,
            provider: this.sourceProviderId,
            fromTimestamp,
            toTimestamp: currentTimestamp,
            limit: MAX_LIMIT,
          },
        })
        .then((responseForSymbol) => {
          response[id] = responseForSymbol.data;
        });
      promises.push(fetchingPromiseForSymbol);
    }
    await Promise.all(promises);

    return response;
  }

  async extractPrices(response: ResponseForTwap): Promise<PricesObj> {
    const pricesObj: PricesObj = {};

    for (const [symbol, historicalPrices] of Object.entries(response)) {
      this.verifySignatures(historicalPrices);
      const twapValue = TwapFetcher.getTwapValue(historicalPrices);
      pricesObj[symbol] = twapValue!;
    }

    return pricesObj;
  }

  async verifySignatures(prices: HistoricalPrice[]) {
    for (const price of prices) {
      await this.verifySignature(price);
    }
  }

  async verifySignature(price: HistoricalPrice) {
    const dataPoint = new NumericDataPoint({
      symbol: price.symbol,
      value: price.value,
      decimals: 18,
    });
    const dataPackage = new DataPackage([dataPoint], price.timestamp);
    const privateKey = config.privateKeys.ethereumPrivateKey;
    const signedDataPackage = dataPackage.sign(privateKey);
    const signatureAsHex = signedDataPackage.serializeSignatureToHex();
    const isSignatureValid = signatureAsHex === price.signature;
    if (!isSignatureValid) {
      throw new Error(
        `Received an invalid signature: ` + JSON.stringify(price)
      );
    }
  }

  static getTwapValue(historicalPrices: HistoricalPrice[]): number | undefined {
    const sortedValidPrices =
      TwapFetcher.getSortedValidPricesByTimestamp(historicalPrices);
    const prices =
      TwapFetcher.aggregatePricesWithSameTimestamps(sortedValidPrices);

    if (prices.length < 2) {
      return prices[0]?.value || undefined;
    } else {
      const totalIntervalLengthInMilliseconds =
        prices[0].timestamp - prices[prices.length - 1].timestamp;
      let twapValue = 0;

      for (
        let intervalIndex = 0;
        intervalIndex < prices.length - 1;
        intervalIndex++
      ) {
        const startPrice = prices[intervalIndex];
        const endPrice = prices[intervalIndex + 1];
        const intervalLengthInMilliseconds =
          startPrice.timestamp - endPrice.timestamp;
        const intervalWeight =
          intervalLengthInMilliseconds / totalIntervalLengthInMilliseconds;
        const intervalAveraveValue = (startPrice.value + endPrice.value) / 2;
        twapValue += intervalAveraveValue * intervalWeight;
      }

      return twapValue;
    }
  }

  // This function groups price objects with the same timestamps
  // and replaces them with a single price object with avg value
  static aggregatePricesWithSameTimestamps(
    sortedValidPrices: HistoricalPrice[]
  ): ShortPrice[] {
    const prev = {
      timestamp: -1,
      sum: 0,
      count: 0,
    };
    const aggregatedPricesWithUniqueTimestamps = [];

    for (const price of sortedValidPrices) {
      if (prev.timestamp !== price.timestamp && prev.timestamp !== -1) {
        // Adding new avg value to the result array
        aggregatedPricesWithUniqueTimestamps.push({
          value: prev.sum / prev.count,
          timestamp: prev.timestamp,
        });

        // Resetting prev object details
        prev.sum = 0;
        prev.count = 0;
      }

      // Updating the prev object
      prev.count++;
      prev.sum += price.value;
      prev.timestamp = price.timestamp;
    }

    // Adding the last aggregated value to the result array
    aggregatedPricesWithUniqueTimestamps.push({
      value: prev.sum / prev.count,
      timestamp: prev.timestamp,
    });

    return aggregatedPricesWithUniqueTimestamps;
  }

  static parseTwapAssetId(twapSymbol: string): {
    assetSymbol: string;
    millisecondsOffset: number;
  } {
    const chunks = twapSymbol.split("-");
    return {
      assetSymbol: chunks[0],
      millisecondsOffset: Number(chunks[chunks.length - 1]) * 60 * 1000,
    };
  }

  static getSortedValidPricesByTimestamp(
    prices: HistoricalPrice[]
  ): HistoricalPrice[] {
    const validHistoricalPrices = prices.filter((p) => !isNaN(p.value));
    validHistoricalPrices.sort((a, b) => a.timestamp - b.timestamp);
    return validHistoricalPrices;
  }
}
