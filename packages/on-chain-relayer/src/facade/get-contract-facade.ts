import {
  getWritableEvmContractAdapter,
  getWritableNonEvmContractAdapter,
} from "@redstone-finance/chain-orchestrator";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { isNonEvmNetworkId } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import { ContractFacade } from "./ContractFacade";
import { MemoryTxDeliveryMan } from "./MemoryTxDeliveryMan";

export const getContractFacade = async (
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) => {
  const { adapter, blockProvider } = isNonEvmNetworkId(relayerConfig.networkId)
    ? await getWritableNonEvmContractAdapter(relayerConfig)
    : getWritableEvmContractAdapter(relayerConfig, getMemoryDeliveryManOverride(relayerConfig));

  return new ContractFacade(adapter, blockProvider, relayerConfig, cache);
};

function getMemoryDeliveryManOverride(relayerConfig: RelayerConfig) {
  return relayerConfig.dryRunWithMemory
    ? new MemoryTxDeliveryMan(relayerConfig.expectedTxDeliveryTimeInMS)
    : undefined;
}
