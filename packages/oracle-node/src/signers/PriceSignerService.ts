import { Consola } from "consola";
import { PriceDataBeforeSigning } from "../types";
import { trackStart, trackEnd } from "../utils/performance-tracker";
import {
  DataPackage,
  NumericDataPoint,
  SignedDataPackagePlainObj,
} from "redstone-protocol";

const logger = require("../utils/logger")("ArweaveService") as Consola;

interface PriceSignerConfig {
  version: string;
  evmChainId: number;
  ethereumPrivateKey: string;
}

// Business service that supplies signing operations required by Redstone-Node
export default class PriceSignerService {
  private ethereumPrivateKey: string;

  constructor(config: PriceSignerConfig) {
    this.ethereumPrivateKey = config.ethereumPrivateKey;
  }

  signPrices(prices: PriceDataBeforeSigning[]): SignedDataPackagePlainObj[] {
    const signingTrackingId = trackStart("signing");
    const signedPrices: SignedDataPackagePlainObj[] = [];
    for (const price of prices) {
      logger.info(`Signing price: ${price.id}`);
      const signedPrice = this.signSinglePrice(price);
      signedPrices.push(signedPrice);
    }
    trackEnd(signingTrackingId);
    return signedPrices;
  }

  signSinglePrice(price: PriceDataBeforeSigning): SignedDataPackagePlainObj {
    logger.info(`Signing price with evm signer: ${price.id}`);
    const { symbol, value, timestamp, ...restParams } = price;
    const dataPoint = new NumericDataPoint({
      symbol,
      value,
    });
    const dataPackage = new DataPackage([dataPoint], timestamp);
    const signedDataPackage = dataPackage.sign(this.ethereumPrivateKey);
    const parsedSignedDataPackage = signedDataPackage.toObj();
    return {
      ...parsedSignedDataPackage,
      ...restParams,
    };
  }

  signPricePackage(
    prices: PriceDataBeforeSigning[]
  ): SignedDataPackagePlainObj {
    const signingTrackingId = trackStart("signing");
    const dataPoints: NumericDataPoint[] = [];

    for (const price of prices) {
      logger.info(`Signing price: ${price.id}`);
      const dataPoint = new NumericDataPoint({
        symbol: price.symbol,
        value: price.value,
      });
      dataPoints.push(dataPoint);
    }
    const { timestamp, provider } = prices[0];
    const dataPackage = new DataPackage(dataPoints, timestamp);
    const signedDataPackage = dataPackage.sign(this.ethereumPrivateKey);
    trackEnd(signingTrackingId);
    const parsedSignedDataPackage = signedDataPackage.toObj();
    return {
      ...parsedSignedDataPackage,
      provider,
    };
  }
}
