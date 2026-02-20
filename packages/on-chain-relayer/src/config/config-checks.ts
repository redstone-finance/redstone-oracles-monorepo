import { RedstoneCommon } from "@redstone-finance/utils";

export function isOevRelayerConfig(relayerConfig: { oevAuctionUrl?: string }) {
  return RedstoneCommon.isTruthy(relayerConfig.oevAuctionUrl?.length);
}

export function isFallbackConfig(config: { fallbackOffsetInMilliseconds?: number }) {
  return RedstoneCommon.isTruthy(config.fallbackOffsetInMilliseconds);
}
