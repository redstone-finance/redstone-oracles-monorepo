import { fetchParsedRpcUrlsFromSsmByNetworkId } from "@redstone-finance/chain-configs";
import {
  getEvmContract,
  getEvmContractAdapter,
  getEvmContractConnector,
} from "@redstone-finance/evm-adapters";
import { AnyOnChainRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
import { isNonEvmNetworkId } from "@redstone-finance/utils";
import { getProviderMemoized } from "../provider/get-provider";
import { getNonEvmMonitoringContractConnector } from "./get-non-evm-monitoring-contract-connector";

export type MonitoringEnv = "prod" | "dev";

export async function getMonitoringContractConnector(
  relayerManifest: AnyOnChainRelayerManifest,
  env: MonitoringEnv
) {
  if (isNonEvmNetworkId(relayerManifest.chain.id)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(relayerManifest.chain.id, env);

    return getNonEvmMonitoringContractConnector(relayerManifest, rpcUrls);
  }

  return await getEvmMonitoringContractConnector(relayerManifest, env);
}

async function getEvmMonitoringContractConnector(
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

  return getEvmContractConnector(provider, adapter);
}
