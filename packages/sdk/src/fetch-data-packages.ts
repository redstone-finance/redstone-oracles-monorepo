import { SignedDataPackage, SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { RequestDataPackagesLogger } from "./RequestDataPackagesLogger";
import { resolveDataServiceUrls } from "./data-services-urls";
import { filterAndSelectDataPackages } from "./filter-and-select-data-packages";
import type { DataPackagesRequestParams } from "./request-data-packages";
import { DataPackagesResponse, getResponseTimestamp } from "./request-data-packages-common";

const GET_REQUEST_TIMEOUT = RedstoneCommon.secsToMs(5);
const DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME_MS = 500;

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
type GwResponse = Partial<z.infer<typeof GwResponseSchema>>;

const pendingPromises: Record<
  string,
  Promise<{ requestDataPackagesLogger?: RequestDataPackagesLogger; response: DataPackagesResponse }>
> = {};

export async function fetchDataPackagesDedup(reqParams: DataPackagesRequestParams) {
  const key = getPathComponents(reqParams).join("/");
  pendingPromises[key] ??= fetchInStages(reqParams);

  try {
    return await pendingPromises[key];
  } finally {
    delete pendingPromises[key];
  }
}

const FIRST_GATEWAY_WAIT_TIME_MS = 1_000;

async function fetchInStages(reqParams: DataPackagesRequestParams) {
  const urls = getUrlsForDataServiceId(reqParams);
  if (urls.length === 0) {
    throw new Error(`Empty urls array provided. Cannot fetch data packages.`);
  }
  if (reqParams.disableMultiPhaseFetching) {
    return await fetchWithLogger(reqParams, urls);
  }
  // first try a single gateway for 1 sec or the provided timeout. If it fails, try all gateways with the provided timeout
  try {
    const stageUrls = [urls[0]];
    const stageReqParams = { ...reqParams, singleGatewayTimeoutMs: FIRST_GATEWAY_WAIT_TIME_MS };
    return await fetchWithLogger(stageReqParams, stageUrls);
  } catch (e) {
    const stageUrls = urls.slice(1);
    if (stageUrls.length === 0) {
      throw e;
    }
    return await fetchWithLogger(reqParams, stageUrls);
  }
}

async function fetchWithLogger(reqParams: DataPackagesRequestParams, urls: string[]) {
  const requestDataPackagesLogger = reqParams.enableEnhancedLogs
    ? new RequestDataPackagesLogger(urls.length, !!reqParams.historicalTimestamp)
    : undefined;
  const { response } = await fetchDataPackages(reqParams, urls, requestDataPackagesLogger);
  return { requestDataPackagesLogger, response };
}

async function fetchDataPackages(
  reqParams: DataPackagesRequestParams,
  urls: string[],
  requestDataPackagesLogger?: RequestDataPackagesLogger
) {
  const promises = prepareDataPackagePromises(reqParams, urls);

  const response = await getTheMostRecentDataPackages(
    reqParams,
    promises,
    reqParams.historicalTimestamp
      ? 0 // we take the first response when historical packages are requested
      : reqParams.waitForAllGatewaysTimeMs,
    requestDataPackagesLogger
  );

  reqParams.storageInstance?.set(response, reqParams);

  return { requestDataPackagesLogger, response };
}

const getTheMostRecentDataPackages = (
  requestParams: DataPackagesRequestParams,
  promises: Promise<DataPackagesResponse>[],
  waitForAllGatewaysTimeMs = DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME_MS,
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
        reject(new AggregateError(collectedErrors, "requestDataPackages failed"));
      } else if (
        collectedResponses.length + collectedErrors.length === promises.length ||
        (isTimedOut && collectedResponses.length !== 0)
      ) {
        const newestPackage = collectedResponses.reduce(
          (a, b) => (getResponseTimestamp(b) > getResponseTimestamp(a) ? b : a),
          {}
        );

        requestDataPackagesLogger?.willResolve(newestPackage, requestParams.dataServiceId);
        clearTimeout(timer);
        didResolveOrReject = true;
        resolve(newestPackage);
      }
    };

    for (let i = 0; i < promises.length; i++) {
      promises[i]
        .then((r) => {
          filterAndSelectDataPackages(r, requestParams, requestDataPackagesLogger); // pre-filtering candidates

          return r; // but returning original response for cache
        })
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

function getPathComponents(reqParams: DataPackagesRequestParams) {
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

  return pathComponents;
}

const prepareDataPackagePromises = (
  reqParams: DataPackagesRequestParams,
  urls: string[]
): Promise<DataPackagesResponse>[] => {
  const pathComponents = getPathComponents(reqParams);

  return urls.map(async (url) => {
    const response = await sendRequestToGateway(
      url,
      pathComponents,
      reqParams.singleGatewayTimeoutMs
    );

    return parseGwResponse(response.data);
  });
};

const maybeGetSignedDataPackage = (dataPackagePlainObj: SignedDataPackagePlainObj) => {
  try {
    return SignedDataPackage.fromObjLazy(dataPackagePlainObj);
  } catch {
    return undefined;
  }
};

const parseGwResponse = (responseData: unknown): DataPackagesResponse => {
  RedstoneCommon.zodAssert<GwResponse>(GwResponseSchema, responseData);

  return Object.fromEntries(
    Object.entries(responseData).map(([dataFeedId, plainObjects]) => {
      const signedDataPackages = plainObjects
        ?.map(maybeGetSignedDataPackage)
        .filter(RedstoneCommon.isDefined);

      return [dataFeedId, signedDataPackages?.length ? signedDataPackages : undefined];
    })
  );
};

const getUrlsForDataServiceId = (reqParams: DataPackagesRequestParams): string[] => {
  return (
    reqParams.urls ??
    resolveDataServiceUrls(reqParams.dataServiceId, {
      historical: !!reqParams.historicalTimestamp,
      metadata: reqParams.hideMetadata === false,
    })
  );
};

function sendRequestToGateway(
  url: string,
  pathComponents: string[],
  timeout = GET_REQUEST_TIMEOUT
) {
  const sanitizedUrl = [url.replace(/\/+$/, "")].concat(pathComponents).join("/");

  return RedstoneCommon.Fetcher.get<Record<string, SignedDataPackagePlainObj[]>>(
    sanitizedUrl,
    timeout
  );
}
