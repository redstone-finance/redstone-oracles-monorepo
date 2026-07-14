import {
  API_TYPE_JITO,
  getSolanaChainId,
  getSolanaCluster,
  SolanaApi,
  SolanaConnectionBuilder,
} from "@redstone-finance/solana-connection";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { Cluster } from "@solana/web3.js";
import { JitoBundleClient } from "./client/JitoBundleClient";
import { SolanaClient } from "./client/SolanaClient";

const DEVNET_CLUSTER: Cluster = "devnet";

export class SolanaClientBuilder extends MultiExecutor.ClientBuilder<SolanaClient> {
  protected override chainType = ChainTypeEnum.enum.solana;
  private shouldUseRedStoneConnection = false;

  withCluster(cluster: Cluster) {
    return this.withChainId(getSolanaChainId(cluster));
  }

  withRedStoneConnection(enabled = true) {
    this.shouldUseRedStoneConnection = enabled;

    return this;
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const connection = new SolanaConnectionBuilder()
      .withChainId(this.chainId)
      .withRpcUrls(this.urls)
      .withQuarantineEnabled(this.isQuarantineEnabled)
      .withRedStoneConnection(this.shouldUseRedStoneConnection)
      .build();

    return MultiExecutor.createForSubInstances(
      connection,
      (conn) => new SolanaClient(conn),
      {
        getSlot: MultiExecutor.ClientBuilder.blockNumberConsensusExecutor,
        viewMethod: MultiExecutor.ExecutionMode.AGREEMENT,
        getBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getSignatureStatus: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountInfo: MultiExecutor.ExecutionMode.AGREEMENT,
        getMultipleAccountsInfo: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
        getRecentPrioritizationFees: MultiExecutor.ExecutionMode.RACE,
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
      },
      {
        ...MultiExecutor.DEFAULT_CONFIG,
        singleExecutionTimeoutMs: MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: MultiExecutor.ALL_EXECUTIONS_TIMEOUT_MS,
        multiAgreementShouldResolveUnagreedToUndefined: true,
      }
    );
  }

  buildWithJito() {
    const client = this.build();
    const hosts = this.jitoHosts();

    return {
      client,
      jito: hosts.length > 0 && this.isJitoAvailable() ? new JitoBundleClient(hosts) : undefined,
    };
  }

  private isJitoAvailable() {
    return (
      RedstoneCommon.isDefined(this.chainId) && getSolanaCluster(this.chainId) !== DEVNET_CLUSTER
    );
  }

  private jitoHosts() {
    return (
      RedstoneCommon.splitUrls(this.urls, SolanaApi.parseUrl)[API_TYPE_JITO]?.map(
        (api) => api.host
      ) ?? []
    );
  }
}
