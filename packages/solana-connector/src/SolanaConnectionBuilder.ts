import { MultiExecutor } from "@redstone-finance/utils";
import { Cluster, Connection } from "@solana/web3.js";
import { connectToCluster } from "./utils";

export const CLUSTER_NAMES: { [chainId: number]: Cluster } = {
  1: "mainnet-beta",
  2: "testnet",
  3: "devnet",
};

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export class SolanaConnectionBuilder {
  private cluster!: Cluster;
  private rpcUrls?: string[];

  static createMultiConnection(
    rpcUrls: string[],
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    const ceilMedianConsensusExecutor =
      new MultiExecutor.CeilMedianConsensusExecutor(
        MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
        BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
      );

    return MultiExecutor.create(
      rpcUrls.map(
        (url) =>
          new Connection(url, {
            commitment: "confirmed",
            wsEndpoint: "",
          })
      ),
      {
        getBlockHeight: ceilMedianConsensusExecutor,
        getSlot: ceilMedianConsensusExecutor,
      },
      { ...MultiExecutor.DEFAULT_CONFIG, ...config }
    );
  }

  withRpcUrls(rpcUrls: string[]) {
    this.rpcUrls = rpcUrls;

    return this;
  }

  withChainId(chainId: number) {
    this.cluster = CLUSTER_NAMES[chainId];

    return this;
  }

  build() {
    if (!this.rpcUrls?.length) {
      return connectToCluster(this.cluster);
    }

    return SolanaConnectionBuilder.createMultiConnection(this.rpcUrls);
  }
}
