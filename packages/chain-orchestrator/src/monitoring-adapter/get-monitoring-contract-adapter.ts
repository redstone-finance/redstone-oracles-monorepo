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

export type MonitoringContractAdapterOpts = {
  env: MonitoringEnv;
  withRounds?: boolean;
};

export async function getMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  opts: MonitoringContractAdapterOpts
): Promise<ContractAdapter> {
  if (isNonEvmNetworkId(relayerManifest.chain.id)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkIdMemoized(
      relayerManifest.chain.id,
      opts.env
    );

    return await getNonEvmMonitoringContractAdapter(relayerManifest, rpcUrls, opts.withRounds);
  }

  return await getEvmMonitoringContractAdapter(relayerManifest, opts);
}

async function getEvmMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  { env, withRounds }: MonitoringContractAdapterOpts
) {
  const provider = await getProviderMemoized(relayerManifest.chain.id, env);
  const adapterContract = getEvmContract(
    {
      adapterContractType: relayerManifest.adapterContractType,
      adapterContractAddress: relayerManifest.adapterContract,
      withRounds,
    },
    provider
  );
  const adapter = getEvmContractAdapter({ ...relayerManifest, withRounds }, adapterContract);

  const connector = getEvmContractConnector(provider, adapter);

  return await ForwardCompatibleFromRedstoneAdapter.fromConnector(connector);
}
