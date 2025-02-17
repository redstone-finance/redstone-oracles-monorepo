import { RedstoneCommon } from "@redstone-finance/utils";
import chalk from "chalk";
import { z } from "zod";
import {
  ChainType,
  fetchParsedRpcUrlsFromSsmByChainId,
  getLocalChainConfigs,
  makeRpcUrlsSsmKey,
} from "../src";

export type RpcUrlsPerChain = {
  [name: string]: {
    chainId: number;
    rpcUrls: string[];
    chainType?: ChainType;
  };
};

const env = RedstoneCommon.getFromEnv(
  "ENV",
  z.enum(["dev", "prod"]).default("dev")
);

export const readSsmRpcUrls = async (
  isFallback: boolean,
  specificChainId?: number
): Promise<RpcUrlsPerChain> => {
  const chainConfigs = getLocalChainConfigs();
  const rpcUrlsPerChain: RpcUrlsPerChain = {};

  for (const { name, chainId, chainType } of Object.values(chainConfigs)) {
    if (
      name === "hardhat" ||
      (specificChainId && chainId !== specificChainId)
    ) {
      continue;
    }
    try {
      const rpcUrls = await fetchParsedRpcUrlsFromSsmByChainId(
        makeRpcUrlsSsmKey(chainId, chainType),
        env,
        isFallback ? "fallback" : "main"
      );

      rpcUrlsPerChain[name] = {
        chainId,
        rpcUrls,
      };
    } catch (e) {
      console.log(
        chalk.yellow(
          `${isFallback ? "Fallback" : "Main"} Rpc urls for chain ${name} (${chainId}) not present in ${env} SSM error=${RedstoneCommon.stringifyError(e)}`
        )
      );
    }
  }
  return rpcUrlsPerChain;
};
