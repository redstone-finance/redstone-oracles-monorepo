import { fetchChainConfigs, getChainConfigByNetworkId } from "@redstone-finance/chain-configs";
import { constructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { getSuiChainId, GRAPHQL_URLS, SuiNetworkName } from "../src";

export async function getRpcUrls(network: SuiNetworkName) {
  const rpcUrls = RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.url()).optional());

  return (
    rpcUrls ??
    getChainConfigByNetworkId(
      await fetchChainConfigs(),
      constructNetworkId(getSuiChainId(network), "sui")
    ).publicRpcUrls
  );
}

export function getGraphQLUrls(network: SuiNetworkName) {
  const urls = RedstoneCommon.getFromEnv("GRAPHQL_URLS", z.array(z.url()).optional());

  return urls ?? [GRAPHQL_URLS[network]];
}
