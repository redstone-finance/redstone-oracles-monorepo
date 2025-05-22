import { Cluster } from "@solana/web3.js";
import _ from "lodash";

export const CLUSTER_NAMES: { [chainId: number]: Cluster } = {
  1: "mainnet-beta",
  2: "testnet",
  3: "devnet",
};

export function getSolanaCluster(chainId: number): Cluster {
  return CLUSTER_NAMES[chainId];
}

export function getSolanaChainId(cluster: Cluster) {
  return Number(_.findKey(CLUSTER_NAMES, (v) => v === cluster)!);
}
