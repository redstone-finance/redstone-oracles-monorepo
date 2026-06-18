import {
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
  getDataPackagesTimestamp,
  getResponseFeedIds,
} from "@redstone-finance/sdk";
import { OperationQueue, RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";

export interface PubSubDataProcessingStrategyDelegate<Config> {
  strategyRunIteration(
    strategy: PubSubDataProcessingStrategy<Config, unknown>,
    config: Config
  ): Promise<void>;

  logger: RedstoneLogger;
}

export abstract class PubSubDataProcessingStrategy<Config, Key = string> {
  delegate?: WeakRef<PubSubDataProcessingStrategyDelegate<Config>>;

  constructor(
    protected facadeCache: DataPackagesResponseCache,
    protected readonly queue = new OperationQueue<Key>()
  ) {}

  abstract processResponse(
    relayerConfig: Config,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ): void;

  abstract runIteration(
    relayerConfig: Config,
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams
  ): Promise<void>;

  protected getDelegate() {
    return this.delegate?.deref();
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- add reason here, please
  protected makeKey(dataPackagesResponse: DataPackagesResponse) {
    const dataPackageIds = getResponseFeedIds(dataPackagesResponse);
    dataPackageIds.sort();

    return dataPackageIds.toString() as Key;
  }

  protected enqueue(
    relayerConfig: Config,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse,
    canAddWhenIsRunning = false
  ) {
    const key = this.makeKey(dataPackagesResponse);

    const wasEnqueued = this.queue.enqueue(
      key,
      () => this.runIteration(relayerConfig, dataPackagesResponse, requestParams),
      canAddWhenIsRunning
    );

    this.getDelegate()?.logger.debug(
      `Enqueuing data for [${RedstoneCommon.stringify(key)}] with timestamp: ${getDataPackagesTimestamp(dataPackagesResponse)}`
    );

    return wasEnqueued;
  }
}
