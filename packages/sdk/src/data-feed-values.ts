import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { resolveDataServiceUrls } from "./data-services-urls";
import {
  getSignersForDataServiceId,
  type DataServiceIds,
} from "./oracle-registry";
import { requestDataPackages } from "./request-data-packages";

export interface GetDataFeedValuesInput {
  aggregationAlgorithm?: "median" | "min" | "max"; // median by default
  dataServiceId?: string; // "redstone-main-demo" by default
  gatewayUrls?: string[]; // if not specified, use default for dataServiceId
}

export type GetDataFeedValuesOutput = Record<string, number | undefined>;

const DEFAULT_DATA_SERVICE_ID = "redstone-main-demo";
const DEFAULT_AGGREGATION_ALGORITHM = "median";

export const getDataFeedValues = async (
  args: GetDataFeedValuesInput = {}
): Promise<GetDataFeedValuesOutput> => {
  const dataServiceId = args.dataServiceId ?? DEFAULT_DATA_SERVICE_ID;
  const aggregationAlgorithm =
    args.aggregationAlgorithm ?? DEFAULT_AGGREGATION_ALGORITHM;
  const gatewayUrls = args.gatewayUrls ?? resolveDataServiceUrls(dataServiceId);

  const packages = await requestDataPackages({
    dataServiceId,
    uniqueSignersCount: 1,
    authorizedSigners: getSignersForDataServiceId(
      dataServiceId as DataServiceIds
    ),
    urls: gatewayUrls,
    returnAllPackages: true,
    skipSignatureVerification: true,
  });

  const result: GetDataFeedValuesOutput = {};

  for (const [dataPackageId, dataPackages] of Object.entries(packages)) {
    if (isMultiPointDataPackageId(dataPackageId)) {
      continue;
    }
    const dataFeedId = dataPackageId;
    const plainValues = dataPackages!.map((dp) =>
      Number(dp.dataPackage.dataPoints[0].toObj().value)
    );

    result[dataFeedId] = aggregateValues(plainValues, aggregationAlgorithm);
  }

  return result;
};

const isMultiPointDataPackageId = (dataPackageId: string) =>
  dataPackageId.startsWith("__") && dataPackageId.endsWith("__");

export const aggregateValues = (
  plainValues: number[],
  aggregationAlgorithm: "median" | "min" | "max"
) => {
  switch (aggregationAlgorithm) {
    case "max":
      return Math.max(...plainValues);
    case "min":
      return Math.min(...plainValues);
    case "median":
      return MathUtils.getMedian(plainValues);
    default:
      return RedstoneCommon.throwUnsupportedParamError(aggregationAlgorithm);
  }
};
