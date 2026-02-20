import { loggerFactory } from "@redstone-finance/utils";
import _ from "lodash";
import { DataPackagesRequestParams } from "./request-data-packages";
import { DataPackagesResponse, getResponseFeedIds } from "./request-data-packages-common";

export class DataPackagesResponseCache {
  private readonly logger = loggerFactory("data-packages-response-cache");

  constructor(
    private response?: DataPackagesResponse,
    private requestParams?: DataPackagesRequestParams
  ) {}

  update(dataPackagesResponse: DataPackagesResponse, requestParams: DataPackagesRequestParams) {
    this.response = dataPackagesResponse;
    this.requestParams = requestParams;

    return this;
  }

  deleteFromResponse(feedId: string) {
    if (!this.response?.[feedId]) {
      return undefined;
    }

    const dataPackages = this.response[feedId];
    const response = { ...this.response };
    delete response[feedId];

    this.response = response;

    return dataPackages;
  }

  takeFromOther(cache: DataPackagesResponseCache) {
    this.invalidate();

    if (cache.response && cache.requestParams) {
      return this.update(cache.response, cache.requestParams);
    } else {
      return this;
    }
  }

  maybeExtend(
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams,
    skipLogging = false
  ) {
    if (!this.requestParams || !this.response) {
      this.update(dataPackagesResponse, requestParams);

      return true;
    }

    if (this.requestParams.returnAllPackages || requestParams.returnAllPackages) {
      this.logger.error("Responses returning all packages are not supported");

      return false;
    }

    const areRequestParamsConforming = areConformingRequestParams(
      this.requestParams,
      requestParams
    );

    const intersection = _.intersection(
      getResponseFeedIds(this.response),
      getResponseFeedIds(dataPackagesResponse)
    );
    const areDataPackageIdsDifferent = Object.keys(intersection).length === 0;

    if (!areRequestParamsConforming || !areDataPackageIdsDifferent) {
      if (!skipLogging) {
        this.logger.error(
          "Trying to extend cache when the new response is not conforming to the cached one",
          {
            requestParams,
            cachedRequestParams: this.requestParams,
            cachedResponse: this.response,
          }
        );
      }

      return false;
    }

    this.update(
      { ...this.response, ...dataPackagesResponse },
      {
        ...this.requestParams,
        dataPackagesIds: Array.from(
          new Set([...this.requestParams.dataPackagesIds, ...requestParams.dataPackagesIds])
        ),
      }
    );

    return true;
  }

  isEmpty() {
    return !this.response || getResponseFeedIds(this.response).length === 0;
  }

  invalidate() {
    this.response = undefined;
    this.requestParams = undefined;

    return this;
  }

  get(requestParams: DataPackagesRequestParams, shouldReportMissingResponse = true) {
    if (!this.requestParams || !this.response) {
      if (shouldReportMissingResponse) {
        this.logger.debug("Trying to use cache when there doesn't exist a cached value", {
          requestParams,
          cachedRequestParams: this.requestParams,
          cachedResponse: this.response,
        });
      }

      return undefined;
    }

    const isRequestConformingToTheCachedValue = isConforming(
      this.requestParams,
      requestParams,
      getResponseFeedIds(this.response)
    );
    if (!isRequestConformingToTheCachedValue) {
      this.logger.debug("The request params are not conforming to the cached value", {
        requestParams,
        cachedRequestParams: this.requestParams,
        cachedResponse: this.response,
      });

      return undefined;
    }

    return filterDataPackages(this.response, requestParams.dataPackagesIds!);
  }
}

function areConformingRequestParams(
  thisRequestParams: DataPackagesRequestParams,
  otherRequestParams: DataPackagesRequestParams
) {
  const thisComparableRequestParams = makeComparableRequestParams(thisRequestParams);
  const otherComparableRequestParams = makeComparableRequestParams(otherRequestParams);

  return _.isEqual(thisComparableRequestParams, otherComparableRequestParams);
}

/**
 * Determines if the cached response conforms to the specified request parameters.
 *
 * Returns `false` if:
 * 1. The cached value doesn't exist for the request parameters set (defined by `makeComparableRequestParams`).
 * 2. The requested data feeds are not a subset of the cached response's data feeds,
 *    and `ignoreMissingFeed` is set to `false`.
 *
 * Returns `true` otherwise.
 *
 * @returns `true` if the cached response conforms to the request; otherwise, `false`.
 */
export function isConforming(
  thisRequestParams: DataPackagesRequestParams,
  otherRequestParams: DataPackagesRequestParams,
  currentResponseDataPackageIds: string[]
) {
  const areConforming = areConformingRequestParams(thisRequestParams, otherRequestParams);
  if (!areConforming) {
    return false;
  }

  if (otherRequestParams.ignoreMissingFeed) {
    return true;
  }

  return new Set(currentResponseDataPackageIds).isSupersetOf(
    new Set(otherRequestParams.dataPackagesIds)
  );
}

function makeComparableRequestParams(requestParams: DataPackagesRequestParams) {
  const {
    dataServiceId,
    uniqueSignersCount,
    authorizedSigners,
    maxTimestampDeviationMS,
    historicalTimestamp,
    ignoreMissingFeed,
  } = requestParams;

  return {
    dataServiceId,
    uniqueSignersCount,
    authorizedSigners,
    maxTimestampDeviationMS,
    historicalTimestamp,
    ignoreMissingFeed,
  };
}

function filterDataPackages(
  currentResponse: DataPackagesResponse,
  dataPackageIdsToInclude: string[]
): DataPackagesResponse {
  if (new Set(dataPackageIdsToInclude).isSupersetOf(new Set(getResponseFeedIds(currentResponse)))) {
    return currentResponse;
  }

  return _.pick(currentResponse, dataPackageIdsToInclude);
}
