import {
  DataPackagesResponse,
  DataPackagesResponseCache,
  getResponseFeedIds,
} from "@redstone-finance/sdk";
import { SetOperationQueue } from "@redstone-finance/utils";
import { BaseMqttDataProcessingStrategy } from "./BaseMqttProcessingStrategy";

export class OptimizedMqttDataProcessingStrategy<C> extends BaseMqttDataProcessingStrategy<
  C,
  Set<string>
> {
  constructor(facadeCache: DataPackagesResponseCache) {
    super(facadeCache, new SetOperationQueue());
  }

  protected override makeKey(dataPackagesResponse: DataPackagesResponse) {
    return new Set(getResponseFeedIds(dataPackagesResponse));
  }
}
