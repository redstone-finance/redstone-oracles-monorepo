import { isDefined } from "../common";
import { ChainType, constructNetworkId, deconstructNetworkId, NetworkId } from "../NetworkId";
import { RpcMetricReporter, RpcOpNormalizer, TelemetryFnDelegate } from "../rpc-telemetry";
import { CeilMedianConsensusExecutor } from "./CeilMedianConsensusExecutor";
import { CompositeFnDelegate } from "./CompositeFnDelegate";
import { DEFAULT_CONFIG, makeBaseConfig, MultiExecutorConfig, NestedMethodConfig } from "./config";
import { create, createForSubInstances } from "./MultiExecutorFactory";
import { QuarantinedListFnDelegate } from "./QuarantinedListFnDelegate";

export const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
export const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export abstract class ClientBuilder<C, URL extends string | undefined = string> {
  protected abstract chainType: ChainType;
  protected urls: URL[] = [];
  protected chainId?: number;
  protected isQuarantineEnabled = false;
  protected telemetryOpNormalizer = new RpcOpNormalizer();
  protected telemetryReporter?: RpcMetricReporter;

  static blockNumberConsensusExecutor = new CeilMedianConsensusExecutor(
    DEFAULT_CONFIG.consensusQuorumRatio,
    BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
  );

  abstract build(): C;

  withNetworkId(networkId: NetworkId) {
    const { chainType, chainId } = deconstructNetworkId(networkId);
    if (chainType !== this.chainType) {
      throw new Error(`Non-${this.chainType} networkId ${networkId} passed to ClientBuilder`);
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

  withTelemetry(reporter: RpcMetricReporter) {
    this.telemetryReporter = reporter;

    return this;
  }

  protected getEligibleUrls() {
    return this.urls;
  }

  protected makeMultiExecutor<T extends object>(
    creator: (url: URL) => T,
    methodConfig: NestedMethodConfig<T>,
    config: Partial<MultiExecutorConfig> = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    return create(this.getEligibleUrls().map(creator), methodConfig, this.makeConfig(config));
  }

  protected makeMultiExecutorForSubInstances<Subject extends object, Sub extends object>(
    subject: Subject,
    callback: (subInstance: Subject) => Sub,
    methodConfig: NestedMethodConfig<Sub>,
    config: Partial<MultiExecutorConfig> = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    return createForSubInstances(subject, callback, methodConfig, this.makeConfig(config));
  }

  private makeConfig(config: Partial<MultiExecutorConfig>) {
    if (!isDefined(this.chainId)) {
      throw new Error(`${this.chainType} client builder requires a networkId (call withNetworkId)`);
    }

    const urls = this.getEligibleUrls();
    const networkId = constructNetworkId(this.chainId, this.chainType);

    return makeBaseConfig(
      {
        descriptions: urls,
        delegate: new CompositeFnDelegate(this.makeFnDelegates(urls, networkId)),
      },
      config
    );
  }

  private makeFnDelegates(urls: URL[], networkId: NetworkId) {
    const quarantineDelegate = this.isQuarantineEnabled
      ? QuarantinedListFnDelegate.getCachedConfig(urls.filter(isDefined), networkId).delegate
      : undefined;
    const telemetryDelegate = this.telemetryReporter
      ? new TelemetryFnDelegate(networkId, this.telemetryReporter, this.telemetryOpNormalizer)
      : undefined;

    return [quarantineDelegate, telemetryDelegate].filter(isDefined);
  }
}
