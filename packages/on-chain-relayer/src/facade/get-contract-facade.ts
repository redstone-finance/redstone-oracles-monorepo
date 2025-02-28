import { getWritableNonEvmContractConnector } from "@redstone-finance/chain-orchestrator";
import {
  isMultiFeedAdapterType,
  isNonEvmConfig,
} from "@redstone-finance/on-chain-relayer-common";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RelayerConfig } from "../config/RelayerConfig";
import { getEvmContractFacade } from "./get-evm-contract-facade";
import { MultiFeedNonEvmContractFacade } from "./MultiFeedNonEvmContractFacade";
import { NonEvmContractFacade } from "./NonEvmContractFacade";

export const getContractFacade = async (
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) => {
  if (isNonEvmConfig(relayerConfig)) {
    return new (
      isMultiFeedAdapterType(relayerConfig.adapterContractType)
        ? MultiFeedNonEvmContractFacade
        : NonEvmContractFacade
    )(await getWritableNonEvmContractConnector(relayerConfig), cache);
  }

  return getEvmContractFacade(relayerConfig, cache);
};
