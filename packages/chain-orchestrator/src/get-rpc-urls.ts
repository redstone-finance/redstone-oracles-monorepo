import { fetchParsedRpcUrlsFromSsmByChainId } from "@redstone-finance/chain-configs";
import { MonitoringEnv } from "@redstone-finance/monitoring-manifests";
import {
  AdapterType,
  getRpcUrlsPathComponent,
} from "@redstone-finance/on-chain-relayer-common";

async function fetchRpcUrls(pathComponent: string, env: MonitoringEnv) {
  if (env === MonitoringEnv.dev) {
    return await fetchParsedRpcUrlsFromSsmByChainId(pathComponent, env);
  }

  try {
    return await fetchParsedRpcUrlsFromSsmByChainId(pathComponent, env);
  } catch {
    // for monitoring CI
    return await fetchParsedRpcUrlsFromSsmByChainId(
      pathComponent,
      MonitoringEnv.dev
    );
  }
}

export async function getRpcUrls(
  env: MonitoringEnv,
  chainId: number,
  adapterType?: AdapterType
) {
  const pathComponent = getRpcUrlsPathComponent(chainId, adapterType);
  const ssmRpcUrls = await fetchRpcUrls(pathComponent, env);
  if (!ssmRpcUrls.length) {
    throw new Error(
      `No RPC URLS defined for chain id ${chainId} on ${env} AWS SSM.`
    );
  }

  return ssmRpcUrls;
}
