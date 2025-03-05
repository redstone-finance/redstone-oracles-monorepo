import { isNonEvmConfig } from "@redstone-finance/on-chain-relayer-common";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RelayerConfig } from "../config/RelayerConfig";
import { getEvmContractFacade } from "./evm/get-evm-contract-facade";
import { getNonEvmContractFacade } from "./non-evm/get-non-evm-contract-facade";

export const getContractFacade = async (
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) => {
  if (isNonEvmConfig(relayerConfig)) {
    return await getNonEvmContractFacade(relayerConfig, cache);
  }

  return getEvmContractFacade(relayerConfig, cache);
};
