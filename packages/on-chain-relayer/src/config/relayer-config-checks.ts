import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";

export function isOevRelayerConfig(relayerConfig: { oevAuctionUrl?: string }) {
  return (
    RedstoneCommon.isDefined(relayerConfig.oevAuctionUrl) && relayerConfig.oevAuctionUrl.length > 0
  );
}

export function isArbitrumStylusRelayerConfig(relayerConfig: { networkId?: NetworkId }) {
  const ARBITRUM_STYLUS_SEPOLIA_CHAIN_ID = 421614;

  return relayerConfig.networkId === ARBITRUM_STYLUS_SEPOLIA_CHAIN_ID;
}
