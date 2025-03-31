import { SupportedNetworkNames } from "./schemas";

const networkToGeckoTerminalNameMap: {
  [key in SupportedNetworkNames]?: string;
} = {
  ethereum: "eth",
  arbitrumOne: "arbitrum",
  avalanche: "avax",
  optimism: "optimism",
  base: "base",
  bnb: "bsc",
  manta: "manta-pacific",
  sei: "sei-evm",
  merlin: "merlin-chain",
  blast: "blast",
  berachain: "berachain",
  fraxtal: "fraxtal",
};

export function mapNetworkNameToGeckoTerminalNetworkName(
  networkName: SupportedNetworkNames
): string | undefined {
  return networkToGeckoTerminalNameMap[networkName];
}

export const allGeckoSupportedNetworkNames: SupportedNetworkNames[] =
  Object.keys(networkToGeckoTerminalNameMap) as SupportedNetworkNames[];
