import {
  Env,
  fetchParsedRpcUrlsFromSsmByChainId,
} from "@redstone-finance/chain-configs";
import {
  AdapterType,
  getNonEvmNetworkName,
  isNonEvmAdapterType,
} from "@redstone-finance/on-chain-relayer-common";

export async function getRpcUrls(
  env: Env,
  chainId: number,
  adapterType?: AdapterType
) {
  const chainType =
    adapterType && isNonEvmAdapterType(adapterType)
      ? getNonEvmNetworkName(adapterType)
      : undefined;

  const ssmRpcUrls = await fetchParsedRpcUrlsFromSsmByChainId(
    chainId,
    env,
    "main",
    chainType
  );

  if (!ssmRpcUrls.length) {
    throw new Error(
      `No RPC URLS defined for chain id ${chainId} on ${env} AWS SSM.`
    );
  }

  return ssmRpcUrls;
}
