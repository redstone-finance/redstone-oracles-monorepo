import { Contract, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { assetToFeedKey, getEntriesKeysWithLabels } from "../sep-40-keys";
import {
  assetToScVal,
  parseAsset,
  parseAssets,
  parseOptionalPriceData,
  parseOptionalPriceDataVec,
  Sep40Asset,
} from "../sep-40-types";
import { contractDataKey, StellarClient } from "../stellar/StellarClient";

const BASE_METHOD = "base";
const ASSETS_METHOD = "assets";
const DECIMALS_METHOD = "decimals";
const RESOLUTION_METHOD = "resolution";
const PRICES_METHOD = "prices";
const LASTPRICE_METHOD = "lastprice";
const PRICE_METHOD = "price";

export class Sep40StellarContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async base(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: BASE_METHOD,
      },
      blockNumber,
      parseAsset
    );
  }

  async assets(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: ASSETS_METHOD,
      },
      blockNumber,
      parseAssets
    );
  }

  async decimals(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: DECIMALS_METHOD,
      },
      blockNumber,
      Number
    );
  }

  async resolution(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: RESOLUTION_METHOD,
      },
      blockNumber,
      Number
    );
  }

  async price(asset: Sep40Asset, timestamp: number, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: PRICE_METHOD,
        args: [assetToScVal(asset), nativeToScVal(timestamp, { type: "u64" })],
      },
      blockNumber,
      parseOptionalPriceData
    );
  }

  async prices(asset: Sep40Asset, records: number, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: PRICES_METHOD,
        args: [assetToScVal(asset), nativeToScVal(records, { type: "u32" })],
      },
      blockNumber,
      parseOptionalPriceDataVec
    );
  }

  // lastprice is a name taken from the sep40 interface and shouldn't be changed to lastPrice
  async lastprice(asset: Sep40Asset, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: LASTPRICE_METHOD,
        args: [assetToScVal(asset)],
      },
      blockNumber,
      parseOptionalPriceData
    );
  }

  async getEntryTtls(blockNumber?: number) {
    const assets = await this.assets(blockNumber);

    const assetEntries = await this.client.fetchEntriesByKey(
      assets.map((asset) => contractDataKey(this.contract, assetToFeedKey(asset)))
    );

    const feeds = assetEntries.map((entry, i) => {
      if (!entry) {
        throw new Error(`Missing AssetToFeed entry for asset at index ${i}`);
      }

      return entry.val.contractData().val().str().toString();
    });

    const { keys, labels }: { keys: (xdr.ScVal | "instance")[]; labels: string[] } =
      getEntriesKeysWithLabels(assets, feeds);

    const ttls = await this.client.getEntriesTtls(this.contract, keys, blockNumber);

    return new Map(labels.map((label, i) => [label, ttls[i]]));
  }
}
