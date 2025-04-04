import { Cluster } from "@solana/web3.js";
import { connectToCluster } from "./utils";

export const CLUSTER_NAMES: { [p: number]: Cluster } = {
  1: "mainnet-beta",
  2: "testnet",
  3: "devnet",
};

export class SolanaConnectionBuilder {
  private cluster!: Cluster;
  private rpcUrls?: string[];

  withRpcUrls(rpcUrls: string[]) {
    this.rpcUrls = rpcUrls;

    return this;
  }

  withChainId(chainId: number) {
    this.cluster = CLUSTER_NAMES[chainId];

    return this;
  }

  build() {
    return connectToCluster(this.cluster);
  }
}
