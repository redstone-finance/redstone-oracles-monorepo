import {
  fetchChainConfigs,
  getChainConfigByNetworkId,
} from "@redstone-finance/chain-configs";
import { constructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import _ from "lodash";
import z from "zod";
import { CLUSTER_NAMES, readCluster } from "../src";
import { readUrl } from "./utils";

export async function getRpcUrls() {
  if (
    RedstoneCommon.getFromEnv(
      "OVERRIDE_URLS_BY_ENV",
      z.boolean().default(false)
    )
  ) {
    return [readUrl()];
  }

  return getChainConfigByNetworkId(
    await fetchChainConfigs(),
    constructNetworkId(
      Number(_.findKey(CLUSTER_NAMES, (c) => c === readCluster())!),
      "solana"
    )
  ).publicRpcUrls;
}
