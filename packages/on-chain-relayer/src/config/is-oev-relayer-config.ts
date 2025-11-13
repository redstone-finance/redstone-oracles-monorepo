import { RedstoneCommon } from "@redstone-finance/utils";

export function isOevRelayerConfig(relayerConfig: { oevAuctionUrl?: string }) {
  return RedstoneCommon.isTruthy(relayerConfig.oevAuctionUrl?.length);
}
