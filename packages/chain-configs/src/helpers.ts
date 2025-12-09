import { Provider } from "@ethersproject/providers";
import {
  EvmMulticallTypes,
  Multicall3Abi,
  RedstoneMulticall3Abi,
} from "@redstone-finance/evm-multicall";
import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { Contract, Wallet } from "ethers";
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

export type Multicall3Options = {
  overrideAddress?: string;
  signerOrProvider: Wallet | Provider;
};

export function getMulticall3(
  opts: Multicall3Options,
  chainConfig: ChainConfig
): EvmMulticallTypes.Multicall3 | EvmMulticallTypes.RedstoneMulticall3 {
  const { multicall3 } = chainConfig;

  const address = opts.overrideAddress ?? multicall3.address;

  if (multicall3.type === "Multicall3") {
    return new Contract(
      address,
      Multicall3Abi,
      opts.signerOrProvider
    ) as EvmMulticallTypes.Multicall3;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- add reason here, please
  } else if (multicall3.type === "RedstoneMulticall3") {
    return new Contract(
      address,
      RedstoneMulticall3Abi,
      opts.signerOrProvider
    ) as EvmMulticallTypes.RedstoneMulticall3;
  } else {
    throw new Error(`Unknown multicall3.type=${String(multicall3)}`);
  }
}
