import {
  getBlockProviderWithRpcUrls,
  getWritableNonEvmContractAdapter,
} from "@redstone-finance/chain-orchestrator";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";
import { ContractFacade } from "../ContractFacade";

export async function getNonEvmContractFacade(
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) {
  const provider = await getBlockProviderWithRpcUrls(
    relayerConfig.networkId,
    relayerConfig.rpcUrls
  );

  if (!RedstoneCommon.isDefined(provider)) {
    throw new Error(`Facade not available for ${relayerConfig.networkId}`);
  }

  return new ContractFacade(
    await getWritableNonEvmContractAdapter(relayerConfig),
    provider,
    relayerConfig,
    cache
  );
}
