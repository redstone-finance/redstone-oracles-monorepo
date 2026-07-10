import { Cluster, clusterApiUrl, Connection } from "@solana/web3.js";

export function connectToCluster(cluster: Cluster) {
  return new Connection(clusterApiUrl(cluster), "confirmed");
}
