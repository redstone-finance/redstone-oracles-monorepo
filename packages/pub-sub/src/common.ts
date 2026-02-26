import { SignedDataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";

export const MAX_PACKAGE_STALENESS = RedstoneCommon.minToMs(2);

export type PackageResponse = Record<string, SignedDataPackage[] | undefined>;

export function cleanStalePackages(
  packagesPerTimestamp: Map<number, PackageResponse>,
  maxPackageStaleness = MAX_PACKAGE_STALENESS
) {
  const now = Date.now();

  for (const timestamp of packagesPerTimestamp.keys()) {
    if (timestamp <= now - maxPackageStaleness) {
      packagesPerTimestamp.delete(timestamp);
    }
  }
}
