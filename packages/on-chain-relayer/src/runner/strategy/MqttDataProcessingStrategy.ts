import {
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
  getDataPackagesTimestamp,
  getResponseFeedIds,
} from "@redstone-finance/sdk";
import { OperationQueue, RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";

export interface MqttDataProcessingStrategyDelegate<C> {
  strategyRunIteration(strategy: MqttDataProcessingStrategy<C, unknown>, config: C): Promise<void>;

  logger: RedstoneLogger;
}

export abstract class MqttDataProcessingStrategy<C, Q = string> {
  delegate?: WeakRef<MqttDataProcessingStrategyDelegate<C>>;

  constructor(
    protected facadeCache: DataPackagesResponseCache,
    protected readonly queue = new OperationQueue<Q>()
  ) {}

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

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- add reason here, please
  protected makeKey(dataPackagesResponse: DataPackagesResponse) {
    const dataPackageIds = getResponseFeedIds(dataPackagesResponse);
    dataPackageIds.sort();

    return dataPackageIds.toString() as Q;
  }

  protected enqueue(
    relayerConfig: C,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse,
    canAddWhenIsRunning: boolean = false
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
