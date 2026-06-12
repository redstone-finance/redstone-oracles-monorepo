import { SignedDataPackage, SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import { RedstoneCommon, loggerFactory } from "@redstone-finance/utils";
import { z } from "zod";
import { RequestDataPackagesLogger } from "./RequestDataPackagesLogger";
import { resolveAuthenticatedGatewayUrls, resolveDataServiceUrls } from "./data-services-urls";
import { filterAndSelectDataPackages } from "./filter-and-select-data-packages";
import type { DataPackagesRequestParams } from "./request-data-packages";
import { DataPackagesResponse, getResponseTimestamp } from "./request-data-packages-common";

const GET_REQUEST_TIMEOUT = RedstoneCommon.secsToMs(5);
const DEFAULT_WAIT_FOR_ALL_GATEWAYS_TIME_MS = 500;
const logger = loggerFactory("fetch-data-packages");

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
  const key = getPathComponents(reqParams).join("/") + getFeedsKey(reqParams);

  pendingPromises[key] ??= fetchInStages(reqParams);

  try {
    return await pendingPromises[key];
  } finally {
    delete pendingPromises[key];
  }
}

const FIRST_GATEWAY_WAIT_TIME_MS = 1_000;

type GatewayTarget = {
  url: string;
  headers?: Record<string, string>;
  byDataFeeds?: boolean;
};

async function fetchInStages(reqParams: DataPackagesRequestParams) {
  const authTargets = getAuthGatewayTargets(reqParams);
  if (authTargets.length) {
    logger.info(
      `Fetching data packages using ${RedstoneCommon.getNS(authTargets.length, "authenticated gateway")} for ${reqParams.dataServiceId}`
    );
    try {
      return await fetchStaged(reqParams, authTargets);
    } catch (e) {
      logger.warn(
        `All authenticated gateways failed, falling back to public gateways. Error: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  const publicTargets = getUrlsForDataServiceId(reqParams).map<GatewayTarget>((url) => ({ url }));

  return await fetchStaged(reqParams, publicTargets);
}

async function fetchStaged(reqParams: DataPackagesRequestParams, targets: GatewayTarget[]) {
  if (targets.length === 0) {
    throw new Error(`Empty urls array provided. Cannot fetch data packages.`);
  }
  if (reqParams.disableMultiPhaseFetching) {
    return await fetchWithLogger(reqParams, targets);
  }
  // first try a single gateway for 1 sec or the provided timeout. If it fails, try all gateways with the provided timeout
  try {
    const stageReqParams = { ...reqParams, singleGatewayTimeoutMs: FIRST_GATEWAY_WAIT_TIME_MS };

    return await fetchWithLogger(stageReqParams, [targets[0]]);
  } catch (e) {
    const stageTargets = targets.slice(1);
    if (stageTargets.length === 0) {
      throw e;
    }

    return await fetchWithLogger(reqParams, stageTargets);
  }
}

async function fetchWithLogger(reqParams: DataPackagesRequestParams, targets: GatewayTarget[]) {
  const requestDataPackagesLogger = reqParams.enableEnhancedLogs
    ? new RequestDataPackagesLogger(targets.length, reqParams.historicalTimestamp)
    : undefined;
  const { response } = await fetchDataPackages(reqParams, targets, requestDataPackagesLogger);

  return { requestDataPackagesLogger, response };
}

async function fetchDataPackages(
  reqParams: DataPackagesRequestParams,
  targets: GatewayTarget[],
  requestDataPackagesLogger?: RequestDataPackagesLogger
) {
  const promises = prepareDataPackagePromises(reqParams, targets);

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

function getPathComponents(reqParams: DataPackagesRequestParams, byDataFeeds = false) {
  const baseType = reqParams.historicalTimestamp ? "historical" : "latest";
  const type = byDataFeeds ? `${baseType}-by-data-feeds` : baseType;
  const pathComponents = ["v2", "data-packages", type, reqParams.dataServiceId];
  if (reqParams.historicalTimestamp) {
    pathComponents.push(`${reqParams.historicalTimestamp}`);
  }
  if (reqParams.hideMetadata === false) {
    pathComponents.push("show-metadata");
  }

  return pathComponents;
}

function getFeedsKey(reqParams: DataPackagesRequestParams): string {
  if (!reqParams.authenticatedGateways?.length || reqParams.returnAllPackages) {
    return "";
  }

  return "|" + [...reqParams.dataPackagesIds].sort().join(",");
}

const prepareDataPackagePromises = (
  reqParams: DataPackagesRequestParams,
  targets: GatewayTarget[]
): Promise<DataPackagesResponse>[] => targets.map((t) => fetchFromGateway(t, reqParams));

function getAuthGatewayTargets(reqParams: DataPackagesRequestParams): GatewayTarget[] {
  if (!reqParams.authenticatedGateways?.length) {
    return [];
  }
  const defaultUrls = resolveAuthenticatedGatewayUrls(reqParams.dataServiceId);

  return reqParams.authenticatedGateways.map((gateway, i) => {
    const url = gateway.url ?? defaultUrls[i];
    if (!url) {
      throw new Error(
        `No URL for authenticated gateway at index ${i}. Either provide a url or ensure authenticatedGateways length does not exceed the number of default URLs for this data service.`
      );
    }

    return {
      url,
      headers: { "x-api-key": gateway.apiKey },
      byDataFeeds: !reqParams.returnAllPackages,
    };
  });
}

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
  timeout = GET_REQUEST_TIMEOUT,
  headers?: Record<string, string>,
  queryParams?: Record<string, string>
) {
  const base = [url.replace(/\/+$/, "")].concat(pathComponents).join("/");
  const fullUrl = queryParams ? `${base}?${new URLSearchParams(queryParams).toString()}` : base;

  return RedstoneCommon.Fetcher.get<Record<string, SignedDataPackagePlainObj[]>>(
    fullUrl,
    timeout,
    headers
  );
}

async function fetchFromGateway(
  target: GatewayTarget,
  reqParams: DataPackagesRequestParams
): Promise<DataPackagesResponse> {
  const { url, byDataFeeds = false, headers } = target;
  const response = await sendRequestToGateway(
    url,
    getPathComponents(reqParams, byDataFeeds),
    reqParams.singleGatewayTimeoutMs,
    headers,
    byDataFeeds ? { dataFeedIds: [...reqParams.dataPackagesIds!].sort().join(",") } : undefined
  );

  return parseGwResponse(response.data);
}
