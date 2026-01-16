import type { SignedDataPackage, SignedDataPackageLike } from "@redstone-finance/protocol";
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

export const getDataPackageFeedIds = (dp: SignedDataPackageLike) =>
  dp.dataPackage.dataPoints.map((dp) => dp.dataFeedId);

export function filterConsistentResponseFeedIds(responseFeedIds: string[][]) {
  const allFeedIds = _.uniq(responseFeedIds.flat());

  return allFeedIds.filter((feedId) =>
    responseFeedIds.every((pkgFeedIds) => pkgFeedIds.includes(feedId))
  );
}

export function getPackageDataFeedIds(packages: SignedDataPackage[]) {
  return filterConsistentResponseFeedIds(packages.map(getDataPackageFeedIds));
}

export function getDataPackagesWithFeedIds(
  response: DataPackagesResponse,
  includeMultiPointPackagesOnly = false
) {
  const value = Object.entries(response)
    .filter(
      ([packageId, dataPackage]) =>
        RedstoneCommon.isDefined(dataPackage) &&
        (!includeMultiPointPackagesOnly || RedstoneCommon.isMultiPointDataPackageId(packageId))
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
  const retainingResponse = Object.entries(getDataPackagesWithFeedIds(response))
    .toSorted(
      (a, b) =>
        Number(RedstoneCommon.isMultiPointDataPackageId(b[0])) -
        Number(RedstoneCommon.isMultiPointDataPackageId(a[0]))
    )
    .reduce(
      (acc, entry) =>
        entry[1].feedIds.some((feedId) => acc.remainingFeedIds.includes(feedId))
          ? {
              remainingFeedIds: acc.remainingFeedIds.filter(
                (feedId) => !entry[1].feedIds.includes(feedId)
              ),
              entries: [...acc.entries, entry],
            }
          : acc,
      {
        remainingFeedIds: [...requestedFeedIds],
        entries: [] as [
          string,
          {
            dataPackage: SignedDataPackage[];
            feedIds: string[];
          },
        ][],
      }
    );

  const entries = retainingResponse.entries.map(([packageId, { dataPackage }]) => [
    packageId,
    dataPackage,
  ]);

  return Object.fromEntries(entries) as DataPackagesResponse;
}

export function getResponseFeedIds(response: DataPackagesResponse) {
  const dataPackageIds = Object.keys(response);
  const containsMultiDataPointPackages = dataPackageIds.find(
    RedstoneCommon.isMultiPointDataPackageId
  );
  if (!containsMultiDataPointPackages) {
    return dataPackageIds;
  }

  const allFeedIds = Object.values(response)
    .filter(RedstoneCommon.isDefined)
    .flatMap(getPackageDataFeedIds);

  return _.uniq(allFeedIds);
}

export const getDataPointsForDataFeedId = (
  dataPackages: DataPackagesResponse,
  dataFeedId: string
) =>
  Object.values(dataPackages)
    .flat()
    .flatMap((dataPackage) => dataPackage!.dataPackage.dataPoints)
    .filter((dataPoint) => dataPoint.dataFeedId === dataFeedId);
