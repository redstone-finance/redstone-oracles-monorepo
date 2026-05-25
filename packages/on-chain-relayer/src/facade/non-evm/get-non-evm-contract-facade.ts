import {
  forceGetBlockProvider,
  getWritableNonEvmContractAdapter,
} from "@redstone-finance/chain-orchestrator";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RelayerConfig } from "../../config/RelayerConfig";
import { ContractFacade } from "../ContractFacade";

export async function getNonEvmContractFacade(
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) {
  const blockProvider = await forceGetBlockProvider(relayerConfig.networkId, relayerConfig.rpcUrls);
  const adapter = getWritableNonEvmContractAdapter(relayerConfig);

  return new ContractFacade(adapter, blockProvider, relayerConfig, cache);
}
