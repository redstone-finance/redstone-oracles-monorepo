import {
  DataPackagesResponse,
  DataPackagesResponseCache,
  getResponseFeedIds,
} from "@redstone-finance/sdk";
import { SetOperationQueue } from "@redstone-finance/utils";
import { BasePubSubDataProcessingStrategy } from "./BasePubSubProcessingStrategy";

export class OptimizedPubSubDataProcessingStrategy<C> extends BasePubSubDataProcessingStrategy<
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
