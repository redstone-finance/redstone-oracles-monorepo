import { getWritableNonEvmContractConnector } from "@redstone-finance/chain-orchestrator";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RelayerConfig } from "../../config/RelayerConfig";
import { ContractFacade } from "../ContractFacade";

export async function getNonEvmContractFacade(
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) {
  return new ContractFacade(
    await getWritableNonEvmContractConnector(relayerConfig),
    relayerConfig,
    cache
  );
}
