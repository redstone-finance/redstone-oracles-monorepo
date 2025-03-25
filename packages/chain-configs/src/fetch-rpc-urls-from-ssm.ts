import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { ChainType, makeRpcUrlsSsmKey } from "./ChainType";

export type Env = "prod" | "dev" | "staging";

export type NodeType = "fallback" | "main";
export type FetchRpcUrlsFromSsmOpts = {
  type: NodeType;
  env: Env;
  chainIds: number[];
  chainType?: ChainType;
};

export type FetchRpcUrlsFromSsmResult = Record<number, string[] | undefined>;

const BATCH_SIZE = 10;

export async function fetchRpcUrlsFromSsm(
  opts: FetchRpcUrlsFromSsmOpts
): Promise<FetchRpcUrlsFromSsmResult> {
  const chainIdsChunks = _.chunk(opts.chainIds, BATCH_SIZE);

  const result: Record<number, string[]> = {};

  for (const chainIds of chainIdsChunks) {
    await Promise.all(
      chainIds.map(async (chainId) => {
        const rpcUrlsForChainId = await fetchRpcUrlsFromSsmByChainId(
          makeRpcUrlsSsmKey(chainId, opts.chainType),
          opts.env,
          opts.type
        );

        if (rpcUrlsForChainId) {
          result[chainId] = JSON.parse(rpcUrlsForChainId) as string[];
        }
      })
    );
  }

  return result;
}

export async function fetchRpcUrlsFromSsmByChainId(
  chainId: number | string,
  env: Env,
  type: NodeType = "main"
): Promise<string | undefined> {
  try {
    const path = `/${env}/rpc/${chainId}/${type === "fallback" ? "fallback/" : ""}urls`;
    const region = type === "fallback" ? "eu-north-1" : undefined;

    return await getSSMParameterValue(path, region);
  } catch (e) {
    if ((e as { name?: string }).name !== "ParameterNotFound") {
      throw new Error(
        `Failed to get rpcUrls for chainId=${chainId}: ${RedstoneCommon.stringifyError(e)}`
      );
    }
    return undefined;
  }
}

export async function fetchParsedRpcUrlsFromSsmByChainId(
  chainId: number | string,
  env: Env,
  type: NodeType = "main"
) {
  const ssmRpcUrls = await fetchRpcUrlsFromSsmByChainId(chainId, env, type);
  if (!ssmRpcUrls) {
    throw new Error(`${env} RPC URLs not found for ${chainId}`);
  }

  return JSON.parse(ssmRpcUrls) as string[];
}
