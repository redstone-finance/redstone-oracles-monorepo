import {
  getSolanaChainId,
  getSolanaCluster,
  SolanaConnectionBuilder,
} from "@redstone-finance/solana-connection";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { Cluster } from "@solana/web3.js";
import { BundleClientBuilder, extractJitoHosts } from "./client/BundleClientBuilder";
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

    if (
      !RedstoneCommon.isDefined(this.chainId) ||
      getSolanaCluster(this.chainId) === DEVNET_CLUSTER ||
      extractJitoHosts(this.urls).length === 0
    ) {
      return { client, jito: undefined };
    }

    const jito = new BundleClientBuilder()
      .withChainId(this.chainId)
      .withRpcUrls(this.urls)
      .withQuarantineEnabled(this.isQuarantineEnabled)
      .build();

    return { client, jito };
  }
}
