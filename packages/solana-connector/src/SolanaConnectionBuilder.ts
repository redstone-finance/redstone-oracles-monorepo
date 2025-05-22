import { MultiExecutor } from "@redstone-finance/utils";
import { Cluster, Connection } from "@solana/web3.js";
import { getSolanaChainId, getSolanaCluster } from "./network-ids";
import { connectToCluster } from "./utils";

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export const ceilMedianConsensusExecutor =
  new MultiExecutor.CeilMedianConsensusExecutor(
    MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
    BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
  );

export class SolanaConnectionBuilder {
  private cluster!: Cluster;
  private rpcUrls?: string[];

  private static createMultiConnection(
    rpcUrls: string[],
    cluster: Cluster,
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    return MultiExecutor.create(
      rpcUrls.map(
        (url) =>
          new Connection(url, {
            commitment: "confirmed",
            wsEndpoint: undefined,
          })
      ),
      {
        getBlockHeight: ceilMedianConsensusExecutor,
        getSlot: ceilMedianConsensusExecutor,
        getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
      },
      MultiExecutor.makeRpcUrlsBasedConfig(
        rpcUrls,
        `solana/${getSolanaChainId(cluster)}`,
        config
      )
    );
  }

  withRpcUrls(rpcUrls: string[]) {
    this.rpcUrls = rpcUrls;

    return this;
  }

  withChainId(chainId: number) {
    this.cluster = getSolanaCluster(chainId);

    return this;
  }

  build() {
    if (!this.rpcUrls?.length) {
      return connectToCluster(this.cluster);
    }

    return SolanaConnectionBuilder.createMultiConnection(
      this.rpcUrls,
      this.cluster
    );
  }
}
