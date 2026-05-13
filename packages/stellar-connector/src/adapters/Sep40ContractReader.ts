import { RedstoneCommon } from "@redstone-finance/utils";
import { Contract, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { assetToFeedKey, feedToAssetKey, getEntriesKeysWithLabels } from "../sep-40-keys";
import {
  assetFromScVal,
  assetLabelFor,
  assetToScVal,
  isOtherAsset,
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

const ASSET_MAPPING_TTL = RedstoneCommon.minToMs(10);

export class Sep40ContractReader {
  private static readonly caches: Map<string, RedstoneCommon.CacheWithTtl<string, Sep40Asset>> =
    new Map();

  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async getDataFeedIds(blockNumber?: number) {
    return (await this.assets(blockNumber)).filter(isOtherAsset).map(assetLabelFor);
  }

  async readLatestData(asset: Sep40Asset, blockNumber?: number) {
    return await this.lastprice(asset, blockNumber);
  }

  async readPrices(asset: Sep40Asset, numberOfRounds: number, blockNumber?: number) {
    return await this.prices(asset, numberOfRounds, blockNumber);
  }

  async readRoundData(asset: Sep40Asset, roundId: bigint, blockNumber?: number) {
    return await this.price(asset, Number(roundId), blockNumber);
  }

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

  async prices(asset: Sep40Asset, recordCount: number, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: PRICES_METHOD,
        args: [assetToScVal(asset), nativeToScVal(recordCount, { type: "u32" })],
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

  async closestTtlToDeadline() {
    const ttls = (await this.getEntryTtls()).values().filter(RedstoneCommon.isDefined);

    return Math.min(...ttls);
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

  async feedToAsset(feedId: string) {
    const cache = this.getOrCreateCache();
    const cached = cache.get(feedId);
    if (RedstoneCommon.isDefined(cached)) {
      return cached;
    }

    const asset = await this.client.getContractData(this.contract, feedToAssetKey(feedId), (res) =>
      assetFromScVal(res.val.contractData().val())
    );

    cache.set(feedId, asset);

    return asset;
  }

  async feedsToAssets(feedIds: string[]) {
    const cache = this.getOrCreateCache();

    const results = new Array<Sep40Asset | undefined>(feedIds.length);
    const missingIndices: number[] = [];
    const missingFeedIds: string[] = [];

    for (const [i, feedId] of feedIds.entries()) {
      const cached = cache.get(feedId);
      if (RedstoneCommon.isDefined(cached)) {
        results[i] = cached;
      } else {
        missingIndices.push(i);
        missingFeedIds.push(feedId);
      }
    }

    if (missingFeedIds.length === 0) {
      return results;
    }

    const feedEntries = await this.client.fetchEntriesByKey(
      missingFeedIds.map((feed) => contractDataKey(this.contract, feedToAssetKey(feed)))
    );

    for (const [j, entry] of feedEntries.entries()) {
      const targetIndex = missingIndices[j];

      if (!RedstoneCommon.isDefined(entry)) {
        results[targetIndex] = undefined;
        continue;
      }

      const asset = assetFromScVal(entry.val.contractData().val());
      cache.set(missingFeedIds[j], asset);
      results[targetIndex] = asset;
    }

    return results;
  }

  private getOrCreateCache() {
    const address = this.contract.address().toString();
    const existing = Sep40ContractReader.caches.get(address);
    if (RedstoneCommon.isDefined(existing)) {
      return existing;
    }

    const cache = new RedstoneCommon.CacheWithTtl<string, Sep40Asset>(ASSET_MAPPING_TTL);
    Sep40ContractReader.caches.set(address, cache);

    return cache;
  }
}
