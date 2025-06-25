import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import chalk from "chalk";
import { z } from "zod";
import {
  fetchParsedRpcUrlsFromSsmByNetworkId,
  getLocalChainConfigs,
} from "../src";

export type RpcUrlsPerChain = {
  [name: string]: {
    networkId: NetworkId;
    rpcUrls: string[];
  };
};

const env = RedstoneCommon.getFromEnv(
  "ENV",
  z.enum(["dev", "prod"]).default("dev")
);

export const readSsmRpcUrls = async (
  isFallback: boolean,
  specificNetworkId?: NetworkId
): Promise<RpcUrlsPerChain> => {
  const chainConfigs = getLocalChainConfigs();
  const rpcUrlsPerChain: RpcUrlsPerChain = {};

  for (const { name, networkId } of Object.values(chainConfigs)) {
    if (
      name === "hardhat" ||
      (specificNetworkId && networkId !== specificNetworkId)
    ) {
      continue;
    }
    try {
      const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(
        networkId,
        env,
        isFallback ? "fallback" : "main"
      );

      rpcUrlsPerChain[name] = {
        networkId,
        rpcUrls,
      };
    } catch (e) {
      console.log(
        chalk.yellow(
          `${isFallback ? "Fallback" : "Main"} Rpc urls for chain ${name} (${networkId}) not present in ${env} error=${RedstoneCommon.stringifyError(e)}`
        )
      );
    }
  }
  return rpcUrlsPerChain;
};
