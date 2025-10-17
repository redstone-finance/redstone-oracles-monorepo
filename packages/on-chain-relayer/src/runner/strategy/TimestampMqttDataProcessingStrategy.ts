import {
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
  getDataPackagesTimestamp,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { MqttDataProcessingStrategy } from "./MqttDataProcessingStrategy";

const NOT_PROCESSED_KEY_WARNING_MS = RedstoneCommon.secsToMs(60);

export class TimestampMqttDataProcessingStrategy<C> extends MqttDataProcessingStrategy<C> {
  private readonly timestampCaches: { [p: number]: DataPackagesResponseCache | undefined } = {};

  override processResponse(
    relayerConfig: C,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ) {
    const timestamp = getDataPackagesTimestamp(dataPackagesResponse);
    const existingCache = this.timestampCaches[timestamp];

    if (!existingCache) {
      this.timestampCaches[timestamp] = new DataPackagesResponseCache(
        dataPackagesResponse,
        requestParams
      );
    } else {
      const didExtend = existingCache.maybeExtend(dataPackagesResponse, requestParams);
      if (!didExtend) {
        this.getDelegate()?.logger.error("Tried to extend wrong cache");
      }
    }

    this.enqueue(relayerConfig, requestParams, dataPackagesResponse, true);
  }

  override async runIteration(
    relayerConfig: C,
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams
  ) {
    this.checkHealth();
    const timestamp = getDataPackagesTimestamp(dataPackagesResponse);

    const cache = this.timestampCaches[timestamp];
    delete this.timestampCaches[timestamp];

    if (!cache) {
      this.getDelegate()?.logger.debug(
        `Cache for the given timestamp has been processed before: ${timestamp}`
      );

      return;
    }

    this.facadeCache.takeFromOther(cache);

    await this.getDelegate()?.strategyRunIteration(this, relayerConfig);

    this.purge(Object.keys(cache.get(requestParams) ?? {}), timestamp);
  }

  private checkHealth() {
    const now = Date.now();
    Object.keys(this.timestampCaches).forEach((key) => {
      const delta = now - Number(key);
      if (delta > NOT_PROCESSED_KEY_WARNING_MS) {
        this.getDelegate()?.logger.warn(
          `Key ${key} was not processed during ${NOT_PROCESSED_KEY_WARNING_MS / 1000} [s]!`,
          delta
        );
      }
    });
  }

  private purge(processedFeeds: string[], timestamp: number) {
    Object.entries(this.timestampCaches)
      .filter(([keyTimestamp, _]) => Number(keyTimestamp) < timestamp)
      .forEach(([keyTimestamp, cache]) => {
        processedFeeds.forEach((feedId) => {
          cache?.deleteFromResponse(feedId);
        });

        if (cache?.isEmpty()) {
          delete this.timestampCaches[Number(keyTimestamp)];
        }
      });
  }
}
