import * as AllDefs from "./canton-defs.json";

export const CantonNetworks = ["mainnet", "devnet", "localnet"] as const;
export type CantonNetwork = (typeof CantonNetworks)[number];

export const chainIdToNetwork = (chainId: number) => CantonNetworks[chainId - 1];
export const networkToChainId = (network: CantonNetwork) => CantonNetworks.indexOf(network) + 1;

export function getCantonNodeConfig(network: CantonNetwork) {
  return AllDefs[network].node;
}
