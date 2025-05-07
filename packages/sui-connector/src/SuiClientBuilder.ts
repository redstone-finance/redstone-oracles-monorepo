import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { getSuiNetworkName } from "./network-ids";
import { makeSuiClient } from "./util";

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export class SuiClientBuilder {
  private urls: string[] = [];
  private network?: SuiNetworkName;

  private static makeMultiExecutor(
    clients: SuiClient[],
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    return MultiExecutor.create(
      clients,
      {
        getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
        signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
        getLatestCheckpointSequenceNumber:
          new MultiExecutor.CeilMedianConsensusExecutor(
            MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
            BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
          ),
        getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      { ...MultiExecutor.DEFAULT_CONFIG, ...config }
    );
  }

  withNetwork(network: SuiNetworkName) {
    this.network = network;

    return this;
  }

  withChainId(chainId: number) {
    return this.withNetwork(getSuiNetworkName(chainId));
  }

  withFullnodeUrl() {
    return this.withRpcUrl(getFullnodeUrl(this.network!));
  }

  withRpcUrl(url: string) {
    this.urls.push(url);

    return this;
  }

  withRpcUrls(urls: string[]) {
    this.urls.push(...urls);

    return this;
  }

  build() {
    if (!this.network) {
      throw new Error("Network not set");
    }

    if (!this.urls.length) {
      this.urls.push(getFullnodeUrl(this.network));
    }

    if (this.urls.length === 1) {
      return makeSuiClient(this.network, this.urls[0]);
    }

    const clients = this.urls.map((url) => makeSuiClient(this.network!, url));

    return SuiClientBuilder.makeMultiExecutor(clients);
  }

  async buildAndVerify() {
    const megaClient = this.build();

    const chainId = await megaClient.getChainIdentifier();

    RedstoneCommon.assert(
      getSuiNetworkName(Number(BigInt("0x" + chainId))) === this.network,
      "Wrong chainId"
    );

    return megaClient;
  }
}
