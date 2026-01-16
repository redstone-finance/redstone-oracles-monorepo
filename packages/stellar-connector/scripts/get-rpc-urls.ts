import { fetchChainConfigs, getChainConfigByNetworkId } from "@redstone-finance/chain-configs";
import { constructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { getStellarChainId, StellarNetwork } from "../src";

export async function getRpcUrls(network: StellarNetwork) {
  const rpcUrl = RedstoneCommon.getFromEnv("RPC_URL", z.url().optional());
  const rpcUrls = rpcUrl
    ? [rpcUrl]
    : RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.url()).optional());

  return (
    rpcUrls ??
    getChainConfigByNetworkId(
      await fetchChainConfigs(),
      constructNetworkId(getStellarChainId(network), "stellar")
    ).publicRpcUrls
  );
}
