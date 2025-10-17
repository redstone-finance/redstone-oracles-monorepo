import { loggerFactory } from "@redstone-finance/utils";
import _ from "lodash";
import { DataPackagesRequestParams } from "./request-data-packages";
import type { DataPackagesResponse } from "./request-data-packages-common";

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
    if (!this.response || !this.response[feedId]) {
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
    requestParams: DataPackagesRequestParams
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
      Object.keys(this.response),
      Object.keys(dataPackagesResponse)
    );
    const areDataPackageIdsDifferent = 0 === Object.keys(intersection).length;

    if (!areRequestParamsConforming || !areDataPackageIdsDifferent) {
      this.logger.error(
        "Trying to extend cache when the new response is not conforming to the cached one",
        {
          requestParams,
          cachedRequestParams: this.requestParams,
          cachedResponse: this.response,
        }
      );

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
    return !this.response || Object.keys(this.response).length === 0;
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
      Object.keys(this.response)
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
  const areConforiming = areConformingRequestParams(thisRequestParams, otherRequestParams);
  if (!areConforiming) {
    return false;
  }

  if (otherRequestParams.ignoreMissingFeed) {
    return true;
  }

  return isSubsetOf(
    new Set(currentResponseDataPackageIds),
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
  if (isSubsetOf(new Set(dataPackageIdsToInclude), new Set(Object.keys(currentResponse)))) {
    return currentResponse;
  }

  return _.pick(currentResponse, dataPackageIdsToInclude);
}

export function isSubsetOf<T>(superset: Set<T>, subset: Set<T>) {
  for (const elem of subset) {
    if (!superset.has(elem)) {
      return false;
    }
  }
  return true;
}
