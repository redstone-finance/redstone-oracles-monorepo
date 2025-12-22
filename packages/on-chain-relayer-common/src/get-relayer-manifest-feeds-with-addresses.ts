import { RedstoneCommon } from "@redstone-finance/utils";
import { isMultiFeedRelayerManifest } from "./adapter-type-utils";
import { AnyOnChainRelayerManifest } from "./schemas";

export const NO_FEED_ADDRESS_VALUE = "__NO_FEED__";

export function getRelayerManifestFeedsWithAddresses(
  relayerManifest: AnyOnChainRelayerManifest,
  symbolsToSkip: string[] = []
) {
  const allManifestFeeds = Object.entries(getRelayerManifestFeeds(relayerManifest));
  const manifestFeedsWithAddresses = allManifestFeeds.filter(
    ([feedId, addr]) =>
      addr !== NO_FEED_ADDRESS_VALUE &&
      RedstoneCommon.isDefined(addr) &&
      !symbolsToSkip.includes(feedId)
  );
  return { allManifestFeeds, manifestFeedsWithAddresses };
}

export function getRelayerManifestFeeds(
  manifest: AnyOnChainRelayerManifest
): Record<string, string> {
  const isMultiFeed = isMultiFeedRelayerManifest(manifest);

  if (isMultiFeed) {
    return Object.fromEntries(
      Object.entries(manifest.priceFeeds).map(([feedId, { priceFeedAddress }]) => [
        feedId,
        priceFeedAddress ?? NO_FEED_ADDRESS_VALUE,
      ])
    );
  }

  return manifest.priceFeeds;
}
