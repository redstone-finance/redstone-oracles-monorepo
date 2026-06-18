import { DataPackagesRequestParams, DataPackagesResponse } from "@redstone-finance/sdk";
import { PubSubDataProcessingStrategy } from "./PubSubDataProcessingStrategy";

export class BasePubSubDataProcessingStrategy<
  Config,
  Key = string,
> extends PubSubDataProcessingStrategy<Config, Key> {
  processResponse(
    relayerConfig: Config,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ) {
    const wasEnqueued = this.enqueue(relayerConfig, requestParams, dataPackagesResponse);

    if (!wasEnqueued) {
      this.facadeCache.update(dataPackagesResponse, requestParams);
    }
  }

  async runIteration(
    relayerConfig: Config,
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams
  ) {
    this.facadeCache.update(dataPackagesResponse, requestParams);

    await this.getDelegate()?.strategyRunIteration(this, relayerConfig);
  }
}
