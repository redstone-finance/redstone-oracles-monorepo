import type { SignedDataPackage } from "@redstone-finance/protocol";

/**
 * represents per-feed response from DDL
 */
export interface DataPackagesResponse {
  [dataPackageId: string]: SignedDataPackage[] | undefined;
}

export const getResponseTimestamp = (response: DataPackagesResponse) =>
  Object.values(response).at(0)?.at(0)?.dataPackage.timestampMilliseconds ?? 0;
