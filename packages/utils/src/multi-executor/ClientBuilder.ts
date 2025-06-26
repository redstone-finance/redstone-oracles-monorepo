import { isDefined } from "../common";
import {
  ChainType,
  constructNetworkId,
  deconstructNetworkId,
  NetworkId,
} from "../NetworkId";
import { CeilMedianConsensusExecutor } from "./CeilMedianConsensusExecutor";
import { DEFAULT_CONFIG, makeBaseConfig, NestedMethodConfig } from "./config";
import { create } from "./create";
import { QuarantinedListFnDelegate } from "./QuarantinedListFnDelegate";

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export abstract class ClientBuilder<
  C,
  URL extends string | undefined = string,
> {
  protected abstract chainType: ChainType;
  protected urls: URL[] = [];
  protected chainId?: number;
  protected isQuarantineEnabled = false;

  static blockNumberConsensusExecutor = new CeilMedianConsensusExecutor(
    DEFAULT_CONFIG.consensusQuorumRatio,
    BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
  );

  abstract build(): C;

  withNetworkId(networkId: NetworkId) {
    const { chainType, chainId } = deconstructNetworkId(networkId);
    if (chainType !== this.chainType) {
      throw new Error(
        `Non-${this.chainType} networkId ${networkId} passed to ClientBuilder`
      );
    }

    return this.withChainId(chainId);
  }

  withChainId(chainId: number) {
    this.chainId = chainId;

    return this;
  }

  withRpcUrl(url: URL) {
    this.urls.push(url);

    return this;
  }

  withRpcUrls(urls: URL[]) {
    this.urls.push(...urls);

    return this;
  }

  withQuarantineEnabled(isQuarantineEnabled = true) {
    this.isQuarantineEnabled = isQuarantineEnabled;

    return this;
  }

  protected makeMultiExecutor<T extends object>(
    creator: (url: URL) => T,
    methodConfig: NestedMethodConfig<T>,
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ): T {
    return create(
      this.urls.map(creator),
      methodConfig,
      makeBaseConfig(
        this.isQuarantineEnabled && this.chainId
          ? QuarantinedListFnDelegate.getCachedConfig(
              this.urls.filter(isDefined),
              constructNetworkId(this.chainId, this.chainType)
            )
          : {},
        config
      )
    );
  }
}
