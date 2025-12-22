import type { SignedDataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";

/**
 * represents per-feed response from DDL
 */
export interface DataPackagesResponse {
  [dataPackageId: string]: SignedDataPackage[] | undefined;
}

export const getResponseTimestamp = (response: DataPackagesResponse) =>
  Object.values(response).at(0)?.at(0)?.dataPackage.timestampMilliseconds ?? 0;

export const isMultiPointDataPackageId = (dataPackageId: string) =>
  dataPackageId.startsWith("__") && dataPackageId.endsWith("__");

export function getPackageDataFeedIds(packages: SignedDataPackage[]) {
  return _.uniq(packages.flatMap((dp) => dp.dataPackage.dataPoints.map((dp) => dp.dataFeedId)));
}

export function getDataPackagesWithFeedIds(
  response: DataPackagesResponse,
  includeMultiPointPackagesOnly = false
) {
  const value = Object.entries(response)
    .filter(
      ([packageId, dataPackage]) =>
        RedstoneCommon.isDefined(dataPackage) &&
        (!includeMultiPointPackagesOnly || isMultiPointDataPackageId(packageId))
    )
    .map(([packageId, dataPackage]) => [
      packageId,
      { feedIds: getPackageDataFeedIds(dataPackage!), dataPackage },
    ]);

  return Object.fromEntries(value) as {
    [p: string]: { dataPackage: SignedDataPackage[]; feedIds: string[] };
  };
}

export function filterRetainingPackagesForDataFeedIds(
  response: DataPackagesResponse,
  requestedFeedIds: string[]
) {
  const value = Object.entries(getDataPackagesWithFeedIds(response))
    .filter(([_, { feedIds }]) => feedIds.some((feedId) => requestedFeedIds.includes(feedId)))
    .map(([packageId, { dataPackage }]) => [packageId, dataPackage]);

  return Object.fromEntries(value) as DataPackagesResponse;
}

export function getResponseFeedIds(response: DataPackagesResponse) {
  const dataPackageIds = Object.keys(response);
  const containsMultiDataPointPackages = dataPackageIds.find(isMultiPointDataPackageId);
  if (!containsMultiDataPointPackages) {
    return dataPackageIds;
  }

  const allFeedIds = Object.values(response)
    .filter(RedstoneCommon.isDefined)
    .flatMap(getPackageDataFeedIds);

  return _.uniq(allFeedIds);
}

export const verifyDataPackagesAreDisjoint = (dataPackages: DataPackagesResponse) => {
  const dataPackagesPerDataFeedId: Partial<Record<string, string>> = {};
  const warnings = new Set<string>();
  for (const dataPackage of Object.values(dataPackages).flat()) {
    for (const dataPoint of dataPackage!.dataPackage.dataPoints) {
      const dataFeedId = dataPoint.dataFeedId;
      const dataPackageName = dataPackage!.dataPackage.dataPackageId;

      if (
        !dataPackagesPerDataFeedId[dataFeedId] ||
        dataPackagesPerDataFeedId[dataFeedId] === dataPackageName
      ) {
        dataPackagesPerDataFeedId[dataFeedId] = dataPackageName;
      } else {
        warnings.add(
          `⛔Potential misconfiguration detected! Data feed ${dataFeedId} included in two packages: ${dataPackageName} and ${dataPackagesPerDataFeedId[dataFeedId]}⛔`
        );
      }
    }
  }
  return Array.from(warnings);
};

export const getDataPointsForDataFeedId = (
  dataPackages: DataPackagesResponse,
  dataFeedId: string
) =>
  Object.values(dataPackages)
    .flat()
    .flatMap((dataPackage) => dataPackage!.dataPackage.dataPoints)
    .filter((dataPoint) => dataPoint.dataFeedId === dataFeedId);
