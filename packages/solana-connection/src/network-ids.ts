import { Cluster } from "@solana/web3.js";
import _ from "lodash";

export const CLUSTER_NAMES: { [chainId: number]: Cluster } = {
  1: "mainnet-beta",
  2: "testnet",
  3: "devnet",
};

export function getSolanaCluster(chainId: number) {
  if (!(chainId in CLUSTER_NAMES)) {
    throw new Error(`Unknown Solana chainId: ${chainId}`);
  }

  return CLUSTER_NAMES[chainId];
}

export function getSolanaChainId(cluster: Cluster) {
  const chainId = _.findKey(CLUSTER_NAMES, (v) => v === cluster);
  if (!chainId) {
    throw new Error(`Unknown Solana cluster: ${cluster}`);
  }

  return Number(chainId);
}
