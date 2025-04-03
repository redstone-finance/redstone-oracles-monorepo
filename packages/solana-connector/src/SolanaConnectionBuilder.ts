import { Cluster } from "@solana/web3.js";
import { connectToCluster } from "./utils";

export class SolanaConnectionBuilder {
  private cluster!: Cluster;
  private rpcUrls?: string[];

  withRpcUrls(rpcUrls: string[]) {
    this.rpcUrls = rpcUrls;

    return this;
  }

  withChainName(chainName: string) {
    this.cluster = chainName as Cluster;

    return this;
  }

  build() {
    return connectToCluster(this.cluster);
  }
}
