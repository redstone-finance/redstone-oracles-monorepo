import {
  EvmMulticallTypes,
  Multicall3Abi,
  RedstoneMulticall3Abi,
} from "@redstone-finance/evm-multicall";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Contract } from "ethers";
import { MegaProviderBuilder } from "../MegaProviderBuilder";
import { ChainConfig, ChainConfigs, SupportedNetworkNames } from "../index";
import { ProviderWithAgreement } from "../providers/ProviderWithAgreement";

export function getChainConfig(networkName: SupportedNetworkNames) {
  return RedstoneCommon.assertThenReturn(
    ChainConfigs[networkName],
    `Couldn't find chain config for ${networkName}`
  ) as ChainConfig;
}

export function getNetworkName(chainId: number) {
  const networkName = Object.entries(ChainConfigs).find(
    ([_, v]) => v.chainId === chainId
  )?.[0];
  RedstoneCommon.assert(
    networkName,
    `Couldn't find network for chain_id=${chainId}`
  );
  return networkName as SupportedNetworkNames;
}

export function getDefaultProvider(
  networkName: SupportedNetworkNames
): ProviderWithAgreement {
  const chainConfig = ChainConfigs[networkName];
  RedstoneCommon.assert(
    chainConfig,
    `network=${networkName} is not supported by ChainConfigs. Add it or fix typo.`
  );

  return new MegaProviderBuilder({
    rpcUrls: chainConfig.publicRpcUrls,
    network: { name: chainConfig.name, chainId: chainConfig.chainId },
    throttleLimit: 1,
    timeout: 10_000,
  })
    .fallback({})
    .build();
}

export function getMulticall3(
  networkName: SupportedNetworkNames,
  overrideAddress?: string
): EvmMulticallTypes.Multicall3 | EvmMulticallTypes.RedstoneMulticall3 {
  const { multicall3 } = ChainConfigs[networkName] as ChainConfig;

  const address = overrideAddress ?? multicall3.address;

  if (multicall3.type === "Multicall3") {
    return new Contract(address, Multicall3Abi) as EvmMulticallTypes.Multicall3;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (multicall3.type === "RedstoneMulticall3") {
    return new Contract(
      address,
      RedstoneMulticall3Abi
    ) as EvmMulticallTypes.RedstoneMulticall3;
  } else {
    throw new Error(`Uknown multicall3.type=${String(multicall3)}`);
  }
}
