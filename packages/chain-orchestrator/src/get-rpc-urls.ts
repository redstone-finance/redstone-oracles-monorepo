import {
  Env,
  fetchParsedRpcUrlsFromSsmByChainId,
} from "@redstone-finance/chain-configs";
import {
  AdapterType,
  getRpcUrlsPathComponent,
} from "@redstone-finance/on-chain-relayer-common";

async function fetchRpcUrls(pathComponent: string, env: Env) {
  if (env === "dev") {
    return await fetchParsedRpcUrlsFromSsmByChainId(pathComponent, env);
  }

  try {
    return await fetchParsedRpcUrlsFromSsmByChainId(pathComponent, env);
  } catch {
    // for monitoring CI
    return await fetchParsedRpcUrlsFromSsmByChainId(pathComponent, "dev");
  }
}

export async function getRpcUrls(
  env: Env,
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
