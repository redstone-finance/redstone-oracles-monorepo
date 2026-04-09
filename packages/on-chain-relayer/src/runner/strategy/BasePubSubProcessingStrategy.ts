import { DataPackagesRequestParams, DataPackagesResponse } from "@redstone-finance/sdk";
import { PubSubDataProcessingStrategy } from "./PubSubDataProcessingStrategy";

export class BasePubSubDataProcessingStrategy<C, Q = string> extends PubSubDataProcessingStrategy<
  C,
  Q
> {
  processResponse(
    relayerConfig: C,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ) {
    const wasEnqueued = this.enqueue(relayerConfig, requestParams, dataPackagesResponse);

    if (!wasEnqueued) {
      this.facadeCache.update(dataPackagesResponse, requestParams);
    }
  }

  async runIteration(
    relayerConfig: C,
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams
  ) {
    this.facadeCache.update(dataPackagesResponse, requestParams);

    await this.getDelegate()?.strategyRunIteration(this, relayerConfig);
  }
}
