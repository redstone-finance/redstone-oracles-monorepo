import {
  Env,
  fetchParsedRpcUrlsFromSsmByChainId,
} from "@redstone-finance/chain-configs";
import {
  AdapterType,
  getRpcUrlsPathComponent,
} from "@redstone-finance/on-chain-relayer-common";

async function fetchRpcUrls(pathComponent: string, env: Env) {
  return await fetchParsedRpcUrlsFromSsmByChainId(
    pathComponent,
    process.env.IS_CI ? "dev" : env
  );
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
