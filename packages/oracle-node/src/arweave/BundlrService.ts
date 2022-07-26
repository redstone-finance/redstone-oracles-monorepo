import BundlrTransaction from "@bundlr-network/client/build/common/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Consola } from "consola";
import { PriceDataAfterAggregation } from "../types";
import { trackEnd, trackStart } from "../utils/performance-tracker";
import BundlrProxy from "./BundlrProxy";

const logger = require("../utils/logger")("BunldrService") as Consola;

// We've added this interface to handle source omitting
export interface PriceDataForPostingOnArweave {
  id: string;
  symbol: string;
  source?: { [sourceName: string]: any };
  timestamp: number;
  version: string;
  value: any;
}

export class BundlrService {
  private readonly bundlrProxy;

  constructor(jwk: JWKInterface) {
    this.bundlrProxy = new BundlrProxy(jwk);
  }

  async prepareBundlrTransaction(
    prices: PriceDataAfterAggregation[]
  ): Promise<BundlrTransaction> {
    // Start time tracking
    const transactionPreparingTrackingId = trackStart("transaction-preparing");

    try {
      logger.info(
        "Keeping prices on arweave blockchain - preparing transaction"
      );
      this.checkAllPricesHaveSameTimestamp(prices);

      // Removing sources (if needed)
      let pricesToAttachInArweaveTx: PriceDataForPostingOnArweave[] = [
        ...prices,
      ];

      // Prepare and sign bundlr transaction
      const transaction = await this.bundlrProxy.prepareSignedTrasaction(
        pricesToAttachInArweaveTx
      );

      return transaction;
    } finally {
      // End time tracking
      trackEnd(transactionPreparingTrackingId);
    }
  }

  async uploadBundlrTransaction(tx: BundlrTransaction) {
    logger.info(
      `Keeping data on arweave blockchain - posting transaction ${tx.id}`
    );
    const keepingTrackingId = trackStart("keeping");

    try {
      await this.bundlrProxy.uploadBundlrTransaction(tx);
      logger.info(`Transaction posted: ${tx.id}`);
    } catch (e: any) {
      logger.error("Error while storing datapoints on Arweave", e.stack);
    } finally {
      trackEnd(keepingTrackingId);
    }
  }

  private checkAllPricesHaveSameTimestamp(prices: PriceDataAfterAggregation[]) {
    if (!prices || prices.length === 0) {
      throw new Error("Can not keep empty array of prices in Arweave");
    }

    const differentTimestamps = new Set(prices.map((price) => price.timestamp));
    if (differentTimestamps.size !== 1) {
      throw new Error(`All prices should have same timestamps.
     Found ${differentTimestamps.size} different timestamps.`);
    }
  }
}
