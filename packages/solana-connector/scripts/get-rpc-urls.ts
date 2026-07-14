import { fetchChainConfigs, getChainConfigByNetworkId } from "@redstone-finance/chain-configs";
import { CLUSTER_NAMES } from "@redstone-finance/solana-connection";
import { constructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import _ from "lodash";
import z from "zod";
import { readCluster } from "../src";
import { readUrls } from "./utils";

export async function getRpcUrls() {
  if (RedstoneCommon.getFromEnv("OVERRIDE_URLS_BY_ENV", z.boolean().default(false))) {
    return readUrls();
  }

  return getChainConfigByNetworkId(
    await fetchChainConfigs(),
    constructNetworkId(Number(_.findKey(CLUSTER_NAMES, (c) => c === readCluster())!), "solana")
  ).publicRpcUrls;
}
