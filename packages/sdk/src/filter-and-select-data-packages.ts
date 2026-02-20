import { SignedDataPackage } from "@redstone-finance/protocol";
import { pickDataFeedPackagesClosestToMedian } from "./pick-closest-to-median";
import type { DataPackagesRequestParams } from "./request-data-packages";
import type { DataPackagesResponse } from "./request-data-packages-common";
import { RequestDataPackagesLogger } from "./RequestDataPackagesLogger";

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

  constructor(message: string, dataFeedId: string, errorType: DataFeedPackageErrorType) {
    super(message);
    this.dataFeedId = dataFeedId;
    this.errorType = errorType;
  }
}

export const checkAndGetSameTimestamp = (dataPackages: SignedDataPackage[]) => {
  if (!dataPackages.length) {
    throw new Error("No data packages for unique timestamp calculation");
  }

  const timestamps = dataPackages.map((dp) => dp.dataPackage.timestampMilliseconds);
  if (new Set(timestamps).size !== 1) {
    throw new Error(`Timestamps do not have the same value: ${timestamps.join(", ")}`);
  }

  return timestamps[0];
};

export const filterAndSelectDataPackages = (
  responseData: DataPackagesResponse,
  reqParams: DataPackagesRequestParams,
  requestDataPackagesLogger?: RequestDataPackagesLogger
): DataPackagesResponse => {
  const parsedResponse: DataPackagesResponse = {};

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
    throw new AggregateError(errors, "requestDataPackages failed");
  }

  return parsedResponse;
};

function validateDataPackagesResponse(
  dataFeedPackages: SignedDataPackage[] | undefined,
  reqParams: DataPackagesRequestParams,
  dataFeedId: string
) {
  if (!dataFeedPackages) {
    const message = `Requested data feed id is not included in response: ${dataFeedId}`;
    throw new DataFeedPackageError(message, dataFeedId, DataFeedPackageErrorType.MissingDataFeed);
  }

  // filter out packages with not expected signers
  dataFeedPackages = dataFeedPackages.filter((dp) => {
    if (reqParams.skipSignatureVerification) {
      return true;
    }

    const signer = maybeGetSigner(dp);
    return signer ? reqParams.authorizedSigners.includes(signer) : false;
  });

  if (dataFeedPackages.length === 0) {
    const message = `No data packages for the data feed: ${dataFeedId}`;
    throw new DataFeedPackageError(message, dataFeedId, DataFeedPackageErrorType.NoDataPackages);
  } else if (dataFeedPackages.length < reqParams.uniqueSignersCount) {
    const message =
      `Too few data packages with unique signers for the data feed: ${dataFeedId}. ` +
      `Expected: ${reqParams.uniqueSignersCount}. ` +
      `Received: ${dataFeedPackages.length}`;
    throw new DataFeedPackageError(message, dataFeedId, DataFeedPackageErrorType.TooFewSigners);
  }

  const timestamp = checkAndGetSameTimestamp(dataFeedPackages); // Needs to be before "if", because it checks the timestamps and throws

  if (reqParams.maxTimestampDeviationMS) {
    const deviation = Math.abs(Date.now() - timestamp);
    if (deviation > reqParams.maxTimestampDeviationMS) {
      const message = `Timestamp deviation exceeded - timestamp: ${timestamp}, deviation: ${deviation}, max deviation: ${reqParams.maxTimestampDeviationMS}`;
      throw new Error(message);
    }
  }

  return dataFeedPackages;
}

function maybeGetSigner(dp: SignedDataPackage) {
  try {
    return dp.recoverSignerAddress();
  } catch {
    return undefined;
  }
}
