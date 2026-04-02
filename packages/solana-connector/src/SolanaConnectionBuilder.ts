import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { Cluster, Commitment, Connection } from "@solana/web3.js";
import { getSolanaChainId, getSolanaCluster } from "./network-ids";
import { RedStoneConnection } from "./RedStoneConnection";
import { connectToCluster } from "./utils";

export class SolanaConnectionBuilder extends MultiExecutor.ClientBuilder<Connection> {
  protected override chainType = ChainTypeEnum.enum.solana;
  private shouldUseRedStoneConnection = false;

  private static connectionInstances: { [p: string]: RedStoneConnection | undefined } = {};

  withCluster(cluster: Cluster) {
    return this.withChainId(getSolanaChainId(cluster));
  }

  withRedStoneConnection(enabled = true) {
    this.shouldUseRedStoneConnection = enabled;

    return this;
  }

  build(): Connection {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    if (!this.urls.length) {
      return connectToCluster(getSolanaCluster(this.chainId));
    }

    return this.makeMultiExecutor((url) => this.makeConnection(url), {
      getBlockHeight: SolanaConnectionBuilder.blockNumberConsensusExecutor,
      getSlot: SolanaConnectionBuilder.blockNumberConsensusExecutor,
      getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
    });
  }

  private makeConnection(url: string) {
    const commitmentOrConfig = {
      commitment: "confirmed" as Commitment,
      disableRetryOnRateLimit: true,
    };

    if (this.shouldUseRedStoneConnection) {
      SolanaConnectionBuilder.connectionInstances[url] ??= new RedStoneConnection(
        url,
        commitmentOrConfig
      );

      return SolanaConnectionBuilder.connectionInstances[url];
    }

    return new Connection(url, commitmentOrConfig);
  }
}
