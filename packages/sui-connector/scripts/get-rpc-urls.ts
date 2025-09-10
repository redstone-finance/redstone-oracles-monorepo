import { fetchChainConfigs, getChainConfigByNetworkId } from "@redstone-finance/chain-configs";
import { constructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { getSuiChainId, SuiNetworkName } from "../src";

export async function getRpcUrls(network: SuiNetworkName) {
  const rpcUrls = RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.string().url()).optional());

  return (
    rpcUrls ??
    getChainConfigByNetworkId(
      await fetchChainConfigs(),
      constructNetworkId(getSuiChainId(network), "sui")
    ).publicRpcUrls
  );
}
