import { NetworkId } from "@redstone-finance/utils";

export function isArbitrumStylusNetworkId(networkId?: NetworkId) {
  const ARBITRUM_STYLUS_SEPOLIA_CHAIN_ID = 421614;

  return networkId === ARBITRUM_STYLUS_SEPOLIA_CHAIN_ID;
}
