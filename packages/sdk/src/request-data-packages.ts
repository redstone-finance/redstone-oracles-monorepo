import {
  SignedDataPackage,
  SignedDataPackagePlainObj,
} from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { z } from "zod";
import { resolveDataServiceUrls } from "./data-services-urls";
import { pickDataFeedPackagesClosestToMedian } from "./pick-closest-to-median";
import { RequestDataPackagesLogger } from "./RequestDataPackagesLogger";

const GET_REQUEST_TIMEOUT = 5_000;
const DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME = 500;
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
   * - 'uniqueSignersCount' packages closest to median of all fetched packages are returned (value 2 is recommended for prod nodes)
   * - throws if there are less signers for any token
   */
  uniqueSignersCount: number;
  /**
   * wait for responses from all the gateways for this time, then wait for at least one response and return the newest fetched packages (does not apply if 'historicalTimestamp' is provided)
   */
  waitForAllGatewaysTimeMs?: number;
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

export type DataPackagesRequestParams = DataPackagesRequestParamsInternal &
  DataPackagesQuery;

/**
 * represents per-feed response from DDL
 */
export interface DataPackagesResponse {
  [dataPackageId: string]: SignedDataPackage[] | undefined;
}

export interface ValuesForDataFeeds {
  [dataFeedId: string]: bigint | undefined;
}

export enum DataFeedPackageErrorType {
  MissingDataFeed = "MissingDataFeed",
  NoDataPackages = "NoDataPackages",
  TooFewSigners = "TooFewSigners",
}

/*
 * IMPORTANT: Monitoring depends on this error.
 * Any changes to DataFeedPackageError (or its attributes) must be accompanied
 * by a review of the monitoring logic to ensure that they still behave correctly.
 */
export class DataFeedPackageError extends Error {
  public dataFeedId: string;
  public errorType: DataFeedPackageErrorType;

  constructor(
    message: string,
    dataFeedId: string,
    errorType: DataFeedPackageErrorType
  ) {
    super(message);
    this.dataFeedId = dataFeedId;
    this.errorType = errorType;
  }
}

export const SignedDataPackageSchema = z.object({
  dataPoints: z
    .array(
      z
        .object({
          dataFeedId: z.string(),
          value: z.number(),
          decimals: z.number().optional(),
        })
        .or(
          z.object({
            dataFeedId: z.string(),
            value: z.string(),
            decimals: z.number().optional(),
          })
        )
    )
    .min(1),
  timestampMilliseconds: z.number(),
  signature: z.string(),
  signerAddress: z.string().optional(),
  dataPackageId: z.string(),
});

const GwResponseSchema = z.record(z.string(), z.array(SignedDataPackageSchema));
export type GwResponse = Partial<z.infer<typeof GwResponseSchema>>;

export const calculateHistoricalPackagesTimestamp = (
  deviationCheckOffsetInMilliseconds: number,
  baseTimestamp: number = Date.now(),
  denominator = HISTORICAL_DATA_PACKAGES_DENOMINATOR_MS
) => {
  if (deviationCheckOffsetInMilliseconds > 0) {
    // We round the timestamp to full 10s, which usually works, better solution will be to have this rounding mechanism implemented in oracle-gateways
    return (
      Math.floor(
        (baseTimestamp - deviationCheckOffsetInMilliseconds) / denominator
      ) * denominator
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
  try {
    const urls = getUrlsForDataServiceId(reqParams);
    const requestDataPackagesLogger = reqParams.enableEnhancedLogs
      ? new RequestDataPackagesLogger(
          urls.length,
          !!reqParams.historicalTimestamp
        )
      : undefined;
    const promises = prepareDataPackagePromises(
      reqParams,
      urls,
      requestDataPackagesLogger
    );

    return await getTheMostRecentDataPackages(
      promises,
      reqParams.historicalTimestamp
        ? 0 // we take the first response when historical packages are requested
        : reqParams.waitForAllGatewaysTimeMs,
      requestDataPackagesLogger
    );
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

export const getResponseTimestamp = (response: DataPackagesResponse) =>
  Object.values(response).at(0)?.at(0)?.dataPackage.timestampMilliseconds ?? 0;

const getTheMostRecentDataPackages = (
  promises: Promise<DataPackagesResponse>[],
  waitForAllGatewaysTimeMs = DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME,
  requestDataPackagesLogger?: RequestDataPackagesLogger
): Promise<DataPackagesResponse> => {
  return new Promise((resolve, reject) => {
    const collectedResponses: DataPackagesResponse[] = [];
    const collectedErrors: Error[] = [];

    let isTimedOut = false;
    let didResolveOrReject = false;
    let timer: NodeJS.Timeout | undefined;

    if (waitForAllGatewaysTimeMs) {
      timer = setTimeout(() => {
        isTimedOut = true;
        checkResults(true);
      }, waitForAllGatewaysTimeMs);
    } else {
      isTimedOut = true;
    }

    const checkResults = (timeout = false) => {
      requestDataPackagesLogger?.willCheckState(timeout, didResolveOrReject);

      if (didResolveOrReject) {
        return;
      }

      if (collectedErrors.length === promises.length) {
        requestDataPackagesLogger?.willReject();
        clearTimeout(timer);
        didResolveOrReject = true;
        reject(new AggregateError(collectedErrors));
      } else if (
        collectedResponses.length + collectedErrors.length ===
          promises.length ||
        (isTimedOut && collectedResponses.length !== 0)
      ) {
        const newestPackage = collectedResponses.reduce(
          (a, b) => (getResponseTimestamp(b) > getResponseTimestamp(a) ? b : a),
          {}
        );

        requestDataPackagesLogger?.willResolve(newestPackage);
        clearTimeout(timer);
        didResolveOrReject = true;
        resolve(newestPackage);
      }
    };

    for (let i = 0; i < promises.length; i++) {
      promises[i]
        .then((r) => {
          collectedResponses.push(r);
          requestDataPackagesLogger?.didReceiveResponse(r, i);
        })
        .catch((e) => {
          collectedErrors.push(e as Error);
          requestDataPackagesLogger?.didReceiveError(e, i);
        })
        .finally(checkResults);
    }
  });
};

const prepareDataPackagePromises = (
  reqParams: DataPackagesRequestParams,
  urls: string[],
  requestDataPackagesLogger?: RequestDataPackagesLogger
): Promise<DataPackagesResponse>[] => {
  if (!reqParams.authorizedSigners.length) {
    throw new Error("Authorized signers array cannot be empty");
  }
  const pathComponents = [
    "v2",
    "data-packages",
    reqParams.historicalTimestamp ? "historical" : "latest",
    reqParams.dataServiceId,
  ];
  if (reqParams.historicalTimestamp) {
    pathComponents.push(`${reqParams.historicalTimestamp}`);
  }
  if (reqParams.hideMetadata === false) {
    pathComponents.push("show-metadata");
  }

  return urls.map(async (url) => {
    const response = await sendRequestToGateway(url, pathComponents);

    return parseAndValidateDataPackagesResponse(
      response.data,
      reqParams,
      requestDataPackagesLogger
    );
  });
};

function validateDataPackagesResponse(
  dataFeedPackages: GwResponse[string] | undefined,
  reqParams: DataPackagesRequestParams,
  dataFeedId: string
) {
  if (!dataFeedPackages) {
    const message = `Requested data feed id is not included in response: ${dataFeedId}`;
    throw new DataFeedPackageError(
      message,
      dataFeedId,
      DataFeedPackageErrorType.MissingDataFeed
    );
  }

  // filter out packages with not expected signers
  dataFeedPackages = dataFeedPackages.filter((dp) => {
    const signer = reqParams.skipSignatureVerification
      ? dp.signerAddress
      : maybeGetSigner(dp);
    return signer ? reqParams.authorizedSigners.includes(signer) : false;
  });

  if (dataFeedPackages.length === 0) {
    const message = `No data packages for the data feed: ${dataFeedId}`;
    throw new DataFeedPackageError(
      message,
      dataFeedId,
      DataFeedPackageErrorType.NoDataPackages
    );
  } else if (dataFeedPackages.length < reqParams.uniqueSignersCount) {
    const message =
      `Too few data packages with unique signers for the data feed: ${dataFeedId}. ` +
      `Expected: ${reqParams.uniqueSignersCount}. ` +
      `Received: ${dataFeedPackages.length}`;
    throw new DataFeedPackageError(
      message,
      dataFeedId,
      DataFeedPackageErrorType.TooFewSigners
    );
  }

  const signedDataPackages = dataFeedPackages.map((dp) =>
    SignedDataPackage.fromObj(dp)
  );

  const timestamp = checkAndGetSameTimestamp(signedDataPackages); // Needs to be before "if", because it checks the timestamps and throws

  if (reqParams.maxTimestampDeviationMS) {
    const deviation = Math.abs(Date.now() - timestamp);
    if (deviation > reqParams.maxTimestampDeviationMS) {
      const message = `Timestamp deviation exceeded - timestamp: ${timestamp}, deviation: ${deviation}, max deviation: ${reqParams.maxTimestampDeviationMS}`;
      throw new Error(message);
    }
  }

  return signedDataPackages;
}

const parseAndValidateDataPackagesResponse = (
  responseData: unknown,
  reqParams: DataPackagesRequestParams,
  requestDataPackagesLogger?: RequestDataPackagesLogger
): DataPackagesResponse => {
  const parsedResponse: DataPackagesResponse = {};

  RedstoneCommon.zodAssert<GwResponse>(GwResponseSchema, responseData);

  const requestedDataFeedIds = reqParams.returnAllPackages
    ? Object.keys(responseData)
    : reqParams.dataPackagesIds;

  const errors = [];
  for (const dataFeedId of requestedDataFeedIds) {
    try {
      const dataFeedPackagesResponse = responseData[dataFeedId];
      const dataFeedPackages = validateDataPackagesResponse(
        dataFeedPackagesResponse,
        reqParams,
        dataFeedId
      );

      parsedResponse[dataFeedId] = reqParams.disableMedianSelection
        ? dataFeedPackages
        : pickDataFeedPackagesClosestToMedian(
            dataFeedPackages.map((dp) => dp.toObj()),
            reqParams.uniqueSignersCount
          );
    } catch (e) {
      if (reqParams.ignoreMissingFeed) {
        requestDataPackagesLogger?.feedIsMissing((e as Error).message);
      } else if (reqParams.aggregateErrors) {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }

  return parsedResponse;
};

const getUrlsForDataServiceId = (
  reqParams: DataPackagesRequestParams
): string[] => {
  return (
    reqParams.urls ??
    resolveDataServiceUrls(reqParams.dataServiceId, {
      historical: !!reqParams.historicalTimestamp,
      metadata: reqParams.hideMetadata === false,
    })
  );
};

function sendRequestToGateway(url: string, pathComponents: string[]) {
  const sanitizedUrl = [url.replace(/\/+$/, "")]
    .concat(pathComponents)
    .join("/");

  return axios.get<Record<string, SignedDataPackagePlainObj[]>>(sanitizedUrl, {
    timeout: GET_REQUEST_TIMEOUT,
  });
}

function maybeGetSigner(dp: SignedDataPackagePlainObj) {
  try {
    return SignedDataPackage.fromObj(dp).recoverSignerAddress();
  } catch {
    return undefined;
  }
}

export const getDataPackagesTimestamp = (
  dataPackages: DataPackagesResponse,
  dataFeedId?: string
) => {
  const signedDataPackages = extractSignedDataPackagesForFeedId(
    dataPackages,
    dataFeedId
  );

  return checkAndGetSameTimestamp(signedDataPackages);
};

export const checkAndGetSameTimestamp = (dataPackages: SignedDataPackage[]) => {
  if (!dataPackages.length) {
    throw new Error("No data packages for unique timestamp calculation");
  }

  const timestamps = dataPackages.map(
    (dp) => dp.dataPackage.timestampMilliseconds
  );
  if (new Set(timestamps).size !== 1) {
    throw new Error(
      `Timestamps do not have the same value: ${timestamps.join(", ")}`
    );
  }

  return timestamps[0];
};

export const extractSignedDataPackagesForFeedId = (
  dataPackages: DataPackagesResponse,
  dataFeedId?: string
) => {
  if (dataFeedId && dataPackages[dataFeedId]) {
    return dataPackages[dataFeedId];
  }

  const signedDataPackages = Object.values(dataPackages).flatMap(
    (dataPackages) => dataPackages!
  );

  if (!dataFeedId) {
    return signedDataPackages;
  }

  return signedDataPackages.filter((dataPackage) =>
    dataPackage.dataPackage.dataPoints.some(
      (dataPoint) => dataPoint.dataFeedId === dataFeedId
    )
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
  if (
    latestDataPackagesTimestamp &&
    historicalTimestamp >= latestDataPackagesTimestamp
  ) {
    historicalTimestamp = calculateHistoricalPackagesTimestamp(
      Math.min(
        HISTORICAL_DATA_PACKAGES_DENOMINATOR_MS,
        fallbackOffsetInMilliseconds
      ),
      latestDataPackagesTimestamp
    )!;
  }

  return {
    ...requestParams,
    historicalTimestamp,
    urls: historicalPackagesGateways,
  };
}
