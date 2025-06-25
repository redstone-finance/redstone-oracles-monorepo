import { getSSMParameterValues } from "@redstone-finance/internal-utils";
import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";

export type Env = "prod" | "dev" | "staging";

export type NodeType = "fallback" | "main";
export type FetchRpcUrlsFromSsmOpts = {
  type: NodeType;
  env: Env;
  networkIds: NetworkId[];
};

export type FetchRpcUrlsFromSsmResult = Record<NetworkId, string[] | undefined>;

export async function fetchRpcUrlsFromSsm(
  opts: FetchRpcUrlsFromSsmOpts
): Promise<FetchRpcUrlsFromSsmResult> {
  const ssmPathToNetworkId: Record<string, NetworkId> = {};
  for (const networkId of opts.networkIds) {
    const ssmPath = `/${opts.env}/rpc/${networkId}/${opts.type === "fallback" ? "fallback/" : ""}urls`;
    ssmPathToNetworkId[ssmPath] = networkId;
  }

  const region = opts.type === "fallback" ? "eu-north-1" : "eu-west-1";
  const ssmParamsResponse = await getSSMParameterValues(
    Object.keys(ssmPathToNetworkId),
    region
  );

  const result: FetchRpcUrlsFromSsmResult = {};

  for (const [ssmPath, value] of Object.entries(ssmParamsResponse)) {
    if (value) {
      try {
        result[ssmPathToNetworkId[ssmPath]] = JSON.parse(value) as string[];
      } catch {
        /* we want to treat invalid json as missing to avoid failing all rpcs because of the single one */
      }
    }
  }

  return result;
}

export async function fetchParsedRpcUrlsFromSsmByNetworkId(
  networkId: NetworkId,
  env: Env,
  type: NodeType = "main"
) {
  const ssmRpcUrls = await fetchRpcUrlsFromSsm({
    networkIds: [networkId],
    env,
    type,
  });
  const rpcUrlsForChain = ssmRpcUrls[networkId];

  if (!RedstoneCommon.isDefined(rpcUrlsForChain)) {
    throw new Error(
      `${env} RPC URLs not found for ${networkId}, or failed to parse`
    );
  }

  return rpcUrlsForChain;
}
