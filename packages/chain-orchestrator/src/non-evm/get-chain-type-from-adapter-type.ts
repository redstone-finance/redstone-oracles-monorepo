import {
  AdapterType,
  getNonEvmNetworkName,
  isNonEvmAdapterType,
} from "@redstone-finance/on-chain-relayer-common";

export function getChainTypeFromAdapterType(adapterType?: AdapterType) {
  return isNonEvmAdapterType(adapterType)
    ? getNonEvmNetworkName(adapterType)
    : undefined;
}
