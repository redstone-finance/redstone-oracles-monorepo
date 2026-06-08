import { RedstoneCommon } from "@redstone-finance/utils";
import { Contract, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { contractDataKey, StellarClient } from "../client/StellarClient";
import { assetToFeedKey, feedToAssetKey, getEntriesKeysWithLabels } from "../sep-40-keys";
import {
  assetFromScVal,
  assetLabelFor,
  assetToScVal,
  parseAsset,
  parseAssets,
  parseOptionalPriceData,
  parseOptionalPriceDataVec,
  Sep40Asset,
} from "../sep-40-types";

const BASE_METHOD = "base";
const ASSETS_METHOD = "assets";
const DECIMALS_METHOD = "decimals";
const RESOLUTION_METHOD = "resolution";
const PRICES_METHOD = "prices";
const LASTPRICE_METHOD = "lastprice";
const PRICE_METHOD = "price";

const ASSET_MAPPING_TTL = RedstoneCommon.minToMs(10);

export class Sep40ContractReader {
  private static readonly feedToAssetCaches: Map<
    string,
    RedstoneCommon.CacheWithTtl<string, Sep40Asset>
  > = new Map();

  private static readonly assetToFeedCaches: Map<
    string,
    RedstoneCommon.CacheWithTtl<string, string>
  > = new Map();

  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async getDataFeedIds(blockNumber?: number) {
    const assets = await this.assets(blockNumber);

    return (await this.assetToFeeds(assets)).filter(RedstoneCommon.isDefined);
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

  async closestTtlToDeadline(blockNumber?: number) {
    const [instanceTtl, entryTtls] = await Promise.all([
      this.client.getInstanceTtl(this.contract, blockNumber),
      this.getEntryTtls(blockNumber),
    ]);
    const ttls = entryTtls.values().filter(RedstoneCommon.isDefined);

    return Math.min(instanceTtl ?? 0, ...ttls);
  }

  async getEntryTtls(blockNumber?: number) {
    const assets = await this.assets(blockNumber);

    const assetEntries = await this.client.fetchEntriesByKey(
      assets.map((asset) => contractDataKey(this.contract, assetToFeedKey(asset))),
      blockNumber
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
    const cache = this.getOrCreateCache(Sep40ContractReader.feedToAssetCaches);
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
    return await this.batchLookup(
      feedIds,
      this.getOrCreateCache(Sep40ContractReader.feedToAssetCaches),
      (feed) => feed,
      feedToAssetKey,
      (data) => assetFromScVal(data.val())
    );
  }

  async assetToFeeds(assets: Sep40Asset[]) {
    return await this.batchLookup(
      assets,
      this.getOrCreateCache(Sep40ContractReader.assetToFeedCaches),
      assetLabelFor,
      assetToFeedKey,
      (data) => data.val().str().toString()
    );
  }

  private async batchLookup<K, V>(
    inputs: K[],
    cache: RedstoneCommon.CacheWithTtl<string, V>,
    cacheKey: (input: K) => string,
    contractKey: (input: K) => xdr.ScVal,
    parse: (data: xdr.ContractDataEntry) => V
  ): Promise<(V | undefined)[]> {
    const results = new Array<V | undefined>(inputs.length);
    const missingIndices: number[] = [];
    const missingInputs: K[] = [];

    for (const [i, input] of inputs.entries()) {
      const cached = cache.get(cacheKey(input));
      if (RedstoneCommon.isDefined(cached)) {
        results[i] = cached;
      } else {
        missingIndices.push(i);
        missingInputs.push(input);
      }
    }

    if (missingInputs.length === 0) {
      return results;
    }

    const entries = await this.client.fetchEntriesByKey(
      missingInputs.map((input) => contractDataKey(this.contract, contractKey(input)))
    );

    for (const [j, entry] of entries.entries()) {
      const targetIndex = missingIndices[j];

      if (!RedstoneCommon.isDefined(entry)) {
        results[targetIndex] = undefined;
        continue;
      }

      const value = parse(entry.val.contractData());
      cache.set(cacheKey(missingInputs[j]), value);
      results[targetIndex] = value;
    }

    return results;
  }

  private getOrCreateCache<V>(
    caches: Map<string, RedstoneCommon.CacheWithTtl<string, V>>
  ): RedstoneCommon.CacheWithTtl<string, V> {
    const address = this.contract.address().toString();
    const existing = caches.get(address);
    if (RedstoneCommon.isDefined(existing)) {
      return existing;
    }

    const cache = new RedstoneCommon.CacheWithTtl<string, V>(ASSET_MAPPING_TTL);
    caches.set(address, cache);

    return cache;
  }
}
