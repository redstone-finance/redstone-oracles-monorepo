import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { type DataServiceIds, getSignersForDataServiceId } from "./oracle-registry";
import { requestDataPackages } from "./request-data-packages";

export interface GetDataFeedValuesInput {
  aggregationAlgorithm?: "median" | "min" | "max"; // median by default
  dataServiceId?: string; // "redstone-primary-demo" by default
  authenticatedGateways: { url?: string; apiKey: string }[];
}

export type GetDataFeedValuesOutput = Record<string, number | undefined>;

const DEFAULT_DATA_SERVICE_ID = "redstone-primary-demo";
const DEFAULT_AGGREGATION_ALGORITHM = "median";

export const getDataFeedValues = async (
  args: GetDataFeedValuesInput
): Promise<GetDataFeedValuesOutput> => {
  const dataServiceId = args.dataServiceId ?? DEFAULT_DATA_SERVICE_ID;
  const aggregationAlgorithm = args.aggregationAlgorithm ?? DEFAULT_AGGREGATION_ALGORITHM;

  const packages = await requestDataPackages({
    dataServiceId,
    uniqueSignersCount: 1,
    authorizedSigners: getSignersForDataServiceId(dataServiceId as DataServiceIds),
    returnAllPackages: true,
    skipSignatureVerification: true,
    authenticatedGateways: args.authenticatedGateways,
  });

  const result: GetDataFeedValuesOutput = {};

  for (const [dataPackageId, dataPackages] of Object.entries(packages)) {
    if (RedstoneCommon.isMultiPointDataPackageId(dataPackageId)) {
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
