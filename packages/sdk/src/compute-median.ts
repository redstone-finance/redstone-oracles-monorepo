import { SignedDataPackage, type SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import { MathUtils } from "@redstone-finance/utils";

/**
 * Computes the median value from a set of signed data packages.
 *
 * NOTE: Does NOT support MultiFeedPackages (packages where dataPoints.length !== 1).
 * Each package must contain exactly one data point representing a single price feed value.
 *
 * @param packages - Array of signed data package plain objects (single-feed only)
 * @returns The median value across all packages
 */
export function computeMedian(packages: SignedDataPackagePlainObj[]): number {
  if (packages.length === 0) {
    throw new Error("computeMedian: packages array must not be empty");
  }

  const values = packages.map((pkg) => {
    if (pkg.dataPoints.length !== 1) {
      throw new Error(
        `computeMedian: package "${pkg.dataPackageId}" has ${pkg.dataPoints.length} data points – ` +
          "MultiFeedPackages are not supported; each package must have exactly 1 data point"
      );
    }
    const { value } = pkg.dataPoints[0];
    if (typeof value === "number") {
      return value;
    }

    throw new Error(
      `computeMedian: package "${pkg.dataPackageId}" has unexpected value type "${typeof value} only number is supported"`
    );
  });

  return MathUtils.getMedian(values);
}

/**
 * Verifies package signatures against a whitelist of signer addresses, then
 * computes the median value from the packages whose signers are whitelisted.
 * Packages with invalid or unrecognized signatures are silently discarded.
 *
 * NOTE: Does NOT support MultiFeedPackages (packages where dataPoints.length !== 1).
 * Each package must contain exactly one data point representing a single price feed value.
 *
 * @param packages - Array of signed data package plain objects (single-feed only)
 * @param whitelistedSigners - Ethereum addresses of accepted signers (case-insensitive)
 * @returns The median value from packages signed by whitelisted signers
 */
export function verifyAndComputeMedian(
  packages: SignedDataPackagePlainObj[],
  whitelistedSigners: string[]
): number {
  const whitelistSet = new Set(whitelistedSigners.map((s) => s.toLowerCase()));

  const verifiedPackages = packages.filter((pkg) => {
    try {
      const signer = SignedDataPackage.fromObjLazy(pkg).getSignerAddress();
      return whitelistSet.has(signer.toLowerCase());
    } catch {
      return false;
    }
  });

  if (verifiedPackages.length === 0) {
    throw new Error(
      "verifyAndComputeMedian: no packages from whitelisted signers found after signature verification"
    );
  }

  return computeMedian(verifiedPackages);
}
