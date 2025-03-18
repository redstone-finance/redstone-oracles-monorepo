import { MultiExecutor } from "@redstone-finance/utils";
import { RadixClient, RadixPrivateKey } from "./RadixClient";

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export class RadixClientBuilder {
  private urls: string[] = [];
  private networkId?: number;
  private privateKey?: RadixPrivateKey;

  private static makeMultiExecutor(
    clients: RadixClient[],
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
      clients,
      {
        getCurrentStateVersion: ceilMedianConsensusExecutor,
        getCurrentEpochNumber: ceilMedianConsensusExecutor,
        call: MultiExecutor.ExecutionMode.RACE,
        waitForCommit: MultiExecutor.ExecutionMode.RACE,
        readValue: MultiExecutor.ExecutionMode.AGREEMENT,
        getXRDBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      { ...MultiExecutor.DEFAULT_CONFIG, ...config }
    );
  }

  withNetworkBasePath(basePath?: string) {
    return basePath ? this.withRpcUrl(basePath) : this;
  }

  withNetworkId(networkId: number) {
    this.networkId = networkId;

    return this;
  }

  withRpcUrl(url: string) {
    this.urls.push(url);

    return this;
  }

  withRpcUrls(urls: string[]) {
    this.urls.push(...urls);

    return this;
  }

  withPrivateKey(privateKey: RadixPrivateKey) {
    this.privateKey = privateKey;

    return this;
  }

  build() {
    if (!this.networkId) {
      throw new Error("Network not set");
    }

    const clients = this.urls.length
      ? this.urls.map(
          (url) => new RadixClient(this.networkId, url, this.privateKey)
        )
      : [new RadixClient(this.networkId, undefined, this.privateKey)];

    return RadixClientBuilder.makeMultiExecutor(clients);
  }
}
