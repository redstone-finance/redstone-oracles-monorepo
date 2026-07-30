import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { ChainConfig, ChainConfigs } from "./schemas";

export function getChainConfig(chainConfigs: ChainConfigs, networkName: string): ChainConfig {
  return RedstoneCommon.assertThenReturn(
    chainConfigs[networkName],
    `Couldn't find chain config for ${networkName}`
  );
}

export function getChainConfigUnsafe(
  chainConfigs: ChainConfigs,
  networkName: string
): ChainConfig | undefined {
  return chainConfigs[networkName];
}

export function getNetworkName(chainConfigs: ChainConfigs, networkId: NetworkId): string {
  const networkName = Object.entries(chainConfigs).find(([_, v]) => v.networkId === networkId)?.[0];
  RedstoneCommon.assert(networkName, `Couldn't find network for network id=${networkId}`);

  return networkName;
}

export function getChainConfigByNetworkId(chainConfigs: ChainConfigs, networkId: NetworkId) {
  return RedstoneCommon.assertThenReturn(
    Object.values(chainConfigs).find((c) => c.networkId === networkId),
    `Failed to getChainConfigByNetworkId chainConfig not defined for ${networkId}`
  );
}
