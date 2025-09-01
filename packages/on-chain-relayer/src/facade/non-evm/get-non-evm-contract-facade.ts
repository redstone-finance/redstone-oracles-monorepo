import { getWritableNonEvmContractConnector } from "@redstone-finance/chain-orchestrator";
import { isMultiFeedAdapterType } from "@redstone-finance/on-chain-relayer-common";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RelayerConfig } from "../../config/RelayerConfig";
import { MultiFeedNonEvmContractFacade } from "./MultiFeedNonEvmContractFacade";
import { NonEvmContractFacade } from "./NonEvmContractFacade";

export async function getNonEvmContractFacade(
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) {
  return new (
    isMultiFeedAdapterType(relayerConfig.adapterContractType)
      ? MultiFeedNonEvmContractFacade
      : NonEvmContractFacade
  )(
    await getWritableNonEvmContractConnector(relayerConfig),
    relayerConfig,
    cache
  );
}
