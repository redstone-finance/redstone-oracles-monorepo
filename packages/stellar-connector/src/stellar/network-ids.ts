import _ from "lodash";

export type StellarNetwork = "mainnet" | "testnet" | "custom";

export const NETWORK_NAMES: { [chainId: number]: StellarNetwork } = {
  1: "mainnet",
  2: "testnet",
  9: "custom",
};

export function getStellarNetwork(chainId: number): StellarNetwork {
  return NETWORK_NAMES[chainId];
}

export function getStellarChainId(network: StellarNetwork) {
  return Number(_.findKey(NETWORK_NAMES, (v) => v === network)!);
}
