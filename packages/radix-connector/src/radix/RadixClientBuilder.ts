import { NetworkId as RadixNetworkId } from "@radixdlt/radix-engine-toolkit";
import {
  ChainTypeEnum,
  deconstructNetworkId,
  MultiExecutor,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { RadixApiClient } from "./RadixApiClient";
import { RadixClient } from "./RadixClient";
import {
  DEFAULT_RADIX_CLIENT_CONFIG,
  RadixClientConfig,
} from "./RadixClientConfig";
import { RadixSigner } from "./RadixSigner";

const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export class RadixClientBuilder {
  private urls: string[] = [];
  private networkId?: number;
  private privateKey?: RedstoneCommon.PrivateKey;
  private clientConfig = DEFAULT_RADIX_CLIENT_CONFIG;

  private static makeMultiExecutor(
    urls: (string | undefined)[],
    networkId = RadixNetworkId.Stokenet,
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ): RadixApiClient {
    const ceilMedianConsensusExecutor =
      new MultiExecutor.CeilMedianConsensusExecutor(
        MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
        BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
      );
    return MultiExecutor.create(
      urls.map((url) => new RadixApiClient(networkId, url)),
      {
        getCurrentStateVersion: ceilMedianConsensusExecutor,
        getCurrentEpochNumber: ceilMedianConsensusExecutor,
        submitTransaction: MultiExecutor.ExecutionMode.RACE,
        getTransactionStatus: MultiExecutor.ExecutionMode.AGREEMENT,
        getFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getNonFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getStateFields: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      MultiExecutor.makeBaseConfig(
        MultiExecutor.QuarantinedListFnDelegate.getCachedConfig(
          urls,
          `radix/${networkId}`
        ),
        config
      )
    );
  }

  withNetworkBasePath(basePath?: string) {
    return basePath ? this.withRpcUrl(basePath) : this;
  }

  withNetworkId(networkId: NetworkId) {
    const { chainType, chainId } = deconstructNetworkId(networkId);
    if (chainType !== ChainTypeEnum.Enum.radix) {
      throw new Error(
        `Non-radix networkId ${networkId} passed to RadixClientBuilder.`
      );
    }

    this.networkId = chainId;

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

  withPrivateKey(privateKey?: RedstoneCommon.PrivateKey) {
    this.privateKey = privateKey;

    return this;
  }

  withClientConfig(config: RadixClientConfig) {
    this.clientConfig = config;

    return this;
  }

  build() {
    if (!this.networkId) {
      throw new Error("Network not set");
    }

    const urls: (string | undefined)[] = this.urls.length
      ? this.urls
      : [undefined];
    const apiClient = RadixClientBuilder.makeMultiExecutor(
      urls,
      this.networkId
    );

    const signer = this.privateKey
      ? new RadixSigner(this.privateKey)
      : undefined;

    return new RadixClient(
      apiClient,
      this.networkId,
      signer,
      this.clientConfig
    );
  }
}
