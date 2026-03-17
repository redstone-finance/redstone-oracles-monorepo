import {
  getEvmContract,
  getEvmContractAdapter,
  getEvmContractConnector,
} from "@redstone-finance/evm-adapters";
import {
  ContractAdapter,
  ForwardCompatibleFromRedstoneAdapter,
} from "@redstone-finance/multichain-kit";
import { AnyOnChainRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
import { isNonEvmNetworkId } from "@redstone-finance/utils";
import {
  fetchParsedRpcUrlsFromSsmByNetworkIdMemoized,
  getProviderMemoized,
} from "../provider/get-provider";
import { getNonEvmMonitoringContractAdapter } from "./get-non-evm-monitoring-contract-adapter";

export type MonitoringEnv = "prod" | "dev";

export async function getMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  env: MonitoringEnv
): Promise<ContractAdapter> {
  if (isNonEvmNetworkId(relayerManifest.chain.id)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkIdMemoized(
      relayerManifest.chain.id,
      env
    );

    return await getNonEvmMonitoringContractAdapter(relayerManifest, rpcUrls);
  }

  return await getEvmMonitoringContractAdapter(relayerManifest, env);
}

async function getEvmMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  env: MonitoringEnv
) {
  const provider = await getProviderMemoized(relayerManifest.chain.id, env);
  const adapterContract = getEvmContract(
    {
      adapterContractType: relayerManifest.adapterContractType,
      adapterContractAddress: relayerManifest.adapterContract,
    },
    provider
  );
  const adapter = getEvmContractAdapter(relayerManifest, adapterContract);

  const connector = getEvmContractConnector(provider, adapter);

  return await ForwardCompatibleFromRedstoneAdapter.fromConnector(connector);
}
