import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { isNonEvmNetworkId } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import { getEvmContractFacade } from "./evm/get-evm-contract-facade";
import { getNonEvmContractFacade } from "./non-evm/get-non-evm-contract-facade";

export const getContractFacade = async (
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) => {
  if (isNonEvmNetworkId(relayerConfig.networkId)) {
    return await getNonEvmContractFacade(relayerConfig, cache);
  }

  return getEvmContractFacade(relayerConfig, cache);
};
