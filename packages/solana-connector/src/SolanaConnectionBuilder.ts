import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { Cluster, Connection } from "@solana/web3.js";
import { getSolanaChainId, getSolanaCluster } from "./network-ids";
import { connectToCluster } from "./utils";

export class SolanaConnectionBuilder extends MultiExecutor.ClientBuilder<Connection> {
  protected override chainType = ChainTypeEnum.Enum.solana;

  withCluster(cluster: Cluster) {
    return this.withChainId(getSolanaChainId(cluster));
  }

  build(): Connection {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    if (!this.urls.length) {
      return connectToCluster(getSolanaCluster(this.chainId));
    }

    return this.makeMultiExecutor(
      (url) =>
        new Connection(url, {
          commitment: "confirmed",
          disableRetryOnRateLimit: true,
        }),
      {
        getBlockHeight: SolanaConnectionBuilder.blockNumberConsensusExecutor,
        getSlot: SolanaConnectionBuilder.blockNumberConsensusExecutor,
        getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }
}
