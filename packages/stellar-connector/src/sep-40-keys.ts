import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { assetLabelFor, assetToScVal, Sep40Asset } from "./sep-40-types";

export const INSTANCE_LABEL = "Instance";
export const ASSETS_LABEL = "Assets";
export const ASSET_TO_FEED_LABEL = "AssetToFeed";
export const FEED_TO_ASSET_LABEL = "FeedToAsset";
export const FEED_DECIMALS_LABEL = "FeedDecimals";

export const ASSETS_KEY = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(ASSETS_LABEL)]);

export function feedToAssetKey(feed: string) {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol(FEED_TO_ASSET_LABEL),
    nativeToScVal(feed, { type: "string" }),
  ]);
}

export function assetToFeedKey(asset: Sep40Asset) {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(ASSET_TO_FEED_LABEL), assetToScVal(asset)]);
}

export function feedDecimalsKey(feed: string) {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol(FEED_DECIMALS_LABEL),
    nativeToScVal(feed, { type: "string" }),
  ]);
}

export function getEntriesKeysWithLabels(assets: Sep40Asset[], feeds: string[]) {
  const labels: string[] = [INSTANCE_LABEL, ASSETS_LABEL];
  const keys: (xdr.ScVal | "instance")[] = ["instance", ASSETS_KEY];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const feed = feeds[i];
    const assetLabel = assetLabelFor(asset);

    labels.push(`${ASSET_TO_FEED_LABEL}(${assetLabel})`);
    keys.push(assetToFeedKey(asset));

    labels.push(`${FEED_TO_ASSET_LABEL}(${feed})`);
    keys.push(feedToAssetKey(feed));

    labels.push(`${FEED_DECIMALS_LABEL}(${feed})`);
    keys.push(feedDecimalsKey(feed));
  }

  return { keys, labels };
}
