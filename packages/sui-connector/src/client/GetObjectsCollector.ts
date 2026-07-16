import type { CoreClient, SuiClientTypes } from "@mysten/sui/client";
import { Collector } from "@redstone-finance/utils";

export type GetObjectsCollectorResult = SuiClientTypes.Object | Error;

const SUI_MULTI_GET_OBJECTS_MAX = 50;
const DEFAULT_COLLECTING_INTERVAL_MS = 100;

export class GetObjectsCollector extends Collector.RequestCollector<
  string,
  GetObjectsCollectorResult
> {
  constructor(
    private readonly core: CoreClient,
    private readonly include?: SuiClientTypes.ObjectInclude,
    collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS,
    maxBatchSize = SUI_MULTI_GET_OBJECTS_MAX
  ) {
    super("sui-get-objects", maxBatchSize, collectingIntervalMs);
  }

  protected override keyToString(objectId: string) {
    return objectId;
  }

  protected override async fetchBatch(objectIds: string[]) {
    const { objects } = await this.core.getObjects({ objectIds, include: this.include });

    return objects;
  }
}
