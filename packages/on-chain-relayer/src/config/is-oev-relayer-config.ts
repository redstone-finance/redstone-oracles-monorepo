import { RedstoneCommon } from "@redstone-finance/utils";

export function isOevRelayerConfig(relayerConfig: { oevAuctionUrl?: string }) {
  return (
    RedstoneCommon.isDefined(relayerConfig.oevAuctionUrl) &&
    relayerConfig.oevAuctionUrl.length > 0
  );
}
