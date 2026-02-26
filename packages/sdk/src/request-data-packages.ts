import { RedstoneCommon } from "@redstone-finance/utils";
import { type DataPackagesResponseStorage } from "./DataPackagesResponseStorage";
import { fetchDataPackagesDedup } from "./fetch-data-packages";
import {
  checkAndGetSameTimestamp,
  filterAndSelectDataPackages,
} from "./filter-and-select-data-packages";
import { type DataPackagesResponse } from "./request-data-packages-common";

export const HISTORICAL_DATA_PACKAGES_DENOMINATOR_MS = 10000;

/**
 * defines behavior of {@link requestDataPackages} method
 */
type DataPackagesRequestParamsInternal = {
  /**
   * for production environment most of the time "redstone-primary-prod" is appropriate
   */
  dataServiceId: string;
  /**
   * array of tokens to fetch
   */
  dataPackagesIds?: string[];
  /**
   * if true dataPackagesIds can be omitted and all packages are returned
   */
  returnAllPackages?: boolean;
  /**
   * ensure minimum number of signers for each token
   * - 'uniqueSignersCount' packages closest to median of all fetched packages are returned (value 3 is recommended for prod nodes)
   * - throws if there are less signers for any token
   */
  uniqueSignersCount: number;
  /**
   * wait for responses from all the gateways for this time, then wait for at least one response and return the newest fetched packages (does not apply if 'historicalTimestamp' is provided)
   */
  waitForAllGatewaysTimeMs?: number;
  /**
   * wait for response from single gateway for this amount of time, 5000 ms by default
   */
  singleGatewayTimeoutMs?: number;
  /**
   * maximum allowed timestamp deviation in milliseconds
   */
  maxTimestampDeviationMS?: number;
  /**
   * accept packages only from specific signers
   */
  authorizedSigners: string[];
  /**
   * when returning multiple feeds signature verification is a heavy operation
   * with this flag signature verification is skipped and left to the caller
   */
  skipSignatureVerification?: boolean;
  /**
   * fetch from specific gateways, if not provided fetch from all publicly available gateways
   */
  urls?: string[];
  /**
   * fetch packages from specific moment (unix timestamp in milliseconds), most of the time this value should be multiple of 10000 (10 sec)
   * in this mode first response is returned to the user
   */
  historicalTimestamp?: number;
  /**
   * do not throw error in case of missing or filtered-out token
   */
  ignoreMissingFeed?: boolean;
  /**
   * adds more detailed logs, depending on the log level
   */
  enableEnhancedLogs?: boolean;
  /**
   * By default, packages closest to the median are returned. Setting this to true causes all packages to be returned.
   */
  disableMedianSelection?: boolean;
  /**
   * By default, the API returns data packages without metadata. Setting this to false causes the API to return data packages with metadata.
   */
  hideMetadata?: boolean;
  /**
   * If set to true, errors encountered during data package validation will be aggregated
   * and thrown as a single AggregateError instead of failing on the first error.
   */
  aggregateErrors?: boolean;
  /**
   * Instance of the storage to be used for caching responses
   */
  storageInstance?: DataPackagesResponseStorage;
};

type DataPackagesQuery =
  | {
      dataPackagesIds: string[];
      returnAllPackages?: false;
    }
  | {
      dataPackagesIds?: never;
      returnAllPackages: true;
    };

export type DataPackagesRequestParams = DataPackagesRequestParamsInternal & DataPackagesQuery;

export interface ValuesForDataFeeds {
  [dataFeedId: string]: bigint | undefined;
}

export const calculateHistoricalPackagesTimestamp = (
  deviationCheckOffsetInMilliseconds: number,
  baseTimestamp: number = Date.now(),
  denominator = HISTORICAL_DATA_PACKAGES_DENOMINATOR_MS
) => {
  if (deviationCheckOffsetInMilliseconds > 0) {
    // We round the timestamp to full 10s, which usually works, better solution will be to have this rounding mechanism implemented in oracle-gateways
    return (
      Math.floor((baseTimestamp - deviationCheckOffsetInMilliseconds) / denominator) * denominator
    );
  }
  return undefined;
};

/**
 * fetch data packages from RedStone DDL
 * @param {DataPackagesRequestParams} reqParams fetch config
 */
export const requestDataPackages = async (
  reqParams: DataPackagesRequestParams
): Promise<DataPackagesResponse> => {
  if (!reqParams.returnAllPackages && !reqParams.dataPackagesIds.length) {
    throw new Error("Please provide at least one dataFeed");
  }

  const cached = reqParams.storageInstance?.get(reqParams);
  if (cached) {
    try {
      return filterAndSelectDataPackages(cached, reqParams);
    } catch {
      // Falling back to non-cached flow

      return await requestDataPackages({ ...reqParams, storageInstance: undefined });
    }
  }

  try {
    const { requestDataPackagesLogger, response } = await fetchDataPackagesDedup(reqParams);

    return filterAndSelectDataPackages(response, reqParams, requestDataPackagesLogger);
  } catch (e) {
    const errMessage = `Request failed: ${JSON.stringify({
      reqParams,
    })}, Original error: ${RedstoneCommon.stringifyError(e)}`;
    if (e instanceof AggregateError) {
      e.message = errMessage;
      throw e;
    }
    throw new Error(errMessage);
  }
};

export const getDataPackagesTimestamp = (
  dataPackages: DataPackagesResponse,
  dataFeedId?: string
) => {
  const signedDataPackages = extractSignedDataPackagesForFeedId(dataPackages, dataFeedId);

  return checkAndGetSameTimestamp(signedDataPackages);
};

export const extractSignedDataPackagesForFeedId = (
  dataPackages: DataPackagesResponse,
  dataFeedId?: string
) => {
  if (dataFeedId && dataPackages[dataFeedId]) {
    return dataPackages[dataFeedId];
  }

  const signedDataPackages = Object.values(dataPackages).flatMap((dataPackages) => dataPackages!);

  if (!dataFeedId) {
    return signedDataPackages;
  }

  return signedDataPackages.filter((dataPackage) =>
    dataPackage.dataPackage.dataPoints.some((dataPoint) => dataPoint.dataFeedId === dataFeedId)
  );
};

export function convertToHistoricalDataPackagesRequestParams(
  requestParams: DataPackagesRequestParams,
  config: {
    fallbackOffsetInMilliseconds: number;
    historicalPackagesGateways?: string[];
  },
  latestDataPackagesTimestamp?: number,
  baseTimestamp?: number
) {
  const { fallbackOffsetInMilliseconds, historicalPackagesGateways } = config;

  if (
    !fallbackOffsetInMilliseconds ||
    !historicalPackagesGateways ||
    !Array.isArray(historicalPackagesGateways) ||
    !historicalPackagesGateways.length
  ) {
    throw new Error(
      `Historical packages fetcher for fallback deviation check is not properly configured: ` +
        `offset=${fallbackOffsetInMilliseconds} milliseconds., gateways=${JSON.stringify(
          historicalPackagesGateways
        )}, isArray=${Array.isArray(historicalPackagesGateways)} `
    );
  }

  let historicalTimestamp = calculateHistoricalPackagesTimestamp(
    fallbackOffsetInMilliseconds,
    baseTimestamp
  )!;
  if (latestDataPackagesTimestamp && historicalTimestamp >= latestDataPackagesTimestamp) {
    historicalTimestamp = calculateHistoricalPackagesTimestamp(
      Math.min(HISTORICAL_DATA_PACKAGES_DENOMINATOR_MS, fallbackOffsetInMilliseconds),
      latestDataPackagesTimestamp
    )!;
  }

  return {
    ...requestParams,
    historicalTimestamp,
    urls: historicalPackagesGateways,
  };
}
