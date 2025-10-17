import {
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
  getDataPackagesTimestamp,
} from "@redstone-finance/sdk";
import { OperationQueue, RedstoneLogger } from "@redstone-finance/utils";

export interface MqttDataProcessingStrategyDelegate<C> {
  strategyRunIteration(strategy: MqttDataProcessingStrategy<C>, config: C): Promise<void>;

  logger: RedstoneLogger;
}

export abstract class MqttDataProcessingStrategy<C> {
  protected readonly queue = new OperationQueue();
  delegate?: WeakRef<MqttDataProcessingStrategyDelegate<C>>;

  constructor(protected facadeCache: DataPackagesResponseCache) {}

  abstract processResponse(
    relayerConfig: C,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ): void;

  abstract runIteration(
    relayerConfig: C,
    dataPackagesResponse: DataPackagesResponse,
    _requestParams: DataPackagesRequestParams
  ): Promise<void>;

  protected getDelegate() {
    return this.delegate?.deref();
  }

  protected enqueue(
    relayerConfig: C,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse,
    canAddWhenIsRunning: boolean = false
  ) {
    const dataPackageIds = Object.keys(dataPackagesResponse);
    dataPackageIds.sort();
    const key = dataPackageIds.toString();

    const wasEnqueued = this.queue.enqueue(
      key,
      () => this.runIteration(relayerConfig, dataPackagesResponse, requestParams),
      canAddWhenIsRunning
    );

    this.getDelegate()?.logger.debug(
      `Enqueuing data for [${dataPackageIds.toString()}] with key ${key}, timestamp: ${getDataPackagesTimestamp(dataPackagesResponse)}`
    );

    return wasEnqueued;
  }
}
