import { getSSMParameterValues } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ChainType, makeRpcUrlsSsmKey } from "./ChainType";

export type Env = "prod" | "dev" | "staging";

export type NodeType = "fallback" | "main";
export type FetchRpcUrlsFromSsmOpts = {
  type: NodeType;
  env: Env;
  chainIdsWithType: string[];
};

export type FetchRpcUrlsFromSsmResult = Record<string, string[] | undefined>;

export async function fetchRpcUrlsFromSsm(
  opts: FetchRpcUrlsFromSsmOpts
): Promise<FetchRpcUrlsFromSsmResult> {
  const ssmPathToChainId: Record<string, string | undefined> = {};
  for (const chainIdWithType of opts.chainIdsWithType) {
    const ssmPath = `/${opts.env}/rpc/${chainIdWithType}/${opts.type === "fallback" ? "fallback/" : ""}urls`;
    ssmPathToChainId[ssmPath] = chainIdWithType;
  }

  const region = opts.type === "fallback" ? "eu-north-1" : undefined;
  const ssmParamsResponse = await getSSMParameterValues(
    Object.keys(ssmPathToChainId),
    region
  );

  const result: FetchRpcUrlsFromSsmResult = {};

  for (const [ssmPath, value] of Object.entries(ssmParamsResponse)) {
    if (value) {
      try {
        result[ssmPathToChainId[ssmPath]!] = JSON.parse(value) as string[];
      } catch {
        /* we want to treat invalid json as missing to avoid failing all rpcs because of the single one */
      }
    }
  }

  return result;
}

export async function fetchParsedRpcUrlsFromSsmByChainId(
  chainId: number,
  env: Env,
  type: NodeType = "main",
  chainType: ChainType = "evm"
) {
  const ssmRpcUrls = await fetchRpcUrlsFromSsm({
    chainIdsWithType: [makeRpcUrlsSsmKey(chainId, chainType)],
    env,
    type,
  });
  const rpcUrlsForChain = ssmRpcUrls[chainId];

  if (!RedstoneCommon.isDefined(rpcUrlsForChain)) {
    throw new Error(
      `${env} RPC URLs not found for ${chainId}, or failed to parse`
    );
  }

  return rpcUrlsForChain;
}
