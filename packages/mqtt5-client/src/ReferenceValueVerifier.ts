import { DataPackage } from "@redstone-finance/protocol";
import { loggerFactory, MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { SignedDataPackageWithSavedSigner } from "./SignedDataPackageWithSavedSigner";
import { cleanStalePackages, PackageResponse } from "./common";

const PACKAGE_TIMESTAMP_GRANULATION_MS = 1_000;
const DEFAULT_THRESHOLD_DEVIATION_PERCENT = 1;
const DEFAULT_DELAY_IN_SECONDS = 3;

export class ReferenceValueVerifier {
  private readonly logger = loggerFactory("reference-value-verifier");
  private readonly packagesPerTimestamp = new Map<number, PackageResponse>();

  constructor(
    private readonly referenceSigners: Set<string>,
    private readonly thresholdDeviationPercent = DEFAULT_THRESHOLD_DEVIATION_PERCENT,
    private readonly maxDelayInSeconds = DEFAULT_DELAY_IN_SECONDS
  ) {}

  private static getNormalizedDataPackageTimestamp(dataPackage: DataPackage) {
    const packageTimestamp = dataPackage.timestampMilliseconds;
    if (packageTimestamp % PACKAGE_TIMESTAMP_GRANULATION_MS === 0) {
      return packageTimestamp;
    }

    return (
      Math.floor(packageTimestamp / PACKAGE_TIMESTAMP_GRANULATION_MS) *
      PACKAGE_TIMESTAMP_GRANULATION_MS
    );
  }

  registerDataPackage(signedDataPackage: SignedDataPackageWithSavedSigner) {
    const dataPackage = signedDataPackage.dataPackage;
    const dataPackageId = dataPackage.dataPackageId;
    const packageTimestamp = ReferenceValueVerifier.getNormalizedDataPackageTimestamp(dataPackage);

    const allEntry = this.packagesPerTimestamp.get(packageTimestamp) ?? {};
    allEntry[dataPackageId] ??= [];
    allEntry[dataPackageId].push(signedDataPackage);
    this.packagesPerTimestamp.set(packageTimestamp, allEntry);
  }

  verifyDataPackage(signedDataPackage: SignedDataPackageWithSavedSigner) {
    const dataPackage = signedDataPackage.dataPackage;
    const packageSigner = signedDataPackage.packageSigner;

    if (this.isReferenceSigner(packageSigner)) {
      return signedDataPackage;
    }

    const packageTimestamp = ReferenceValueVerifier.getNormalizedDataPackageTimestamp(dataPackage);
    const logDescription = `for ${dataPackage.dataPackageId}/${packageSigner} on ${packageTimestamp}`;

    const deviationPercent = this.getReferenceValueDeviation(
      dataPackage,
      this.findReferenceEntries(packageTimestamp),
      logDescription
    );

    if (deviationPercent >= this.thresholdDeviationPercent) {
      this.logger.error(`Deviation exceeded ${logDescription}`, { deviationPercent });

      return undefined;
    }

    return signedDataPackage;
  }

  cleanStalePackages() {
    cleanStalePackages(this.packagesPerTimestamp);
  }

  private isReferenceSigner(packageSigner: string) {
    return this.referenceSigners.has(packageSigner);
  }

  private findReferenceEntries(timestamp: number) {
    const result = [];

    for (let i = 0; i <= this.maxDelayInSeconds; i++) {
      const timestampKey = timestamp - i * PACKAGE_TIMESTAMP_GRANULATION_MS;

      const entry = this.packagesPerTimestamp.get(timestampKey);
      if (!entry) {
        continue;
      }

      result.push(entry);
    }

    return result;
  }

  private getReferenceValueDeviation(
    dataPackage: DataPackage,
    referenceEntries: PackageResponse[],
    logDescription: string
  ) {
    const signerValues = new Map<string, string | number>();

    for (const entry of referenceEntries) {
      const packages = entry[dataPackage.dataPackageId];

      if (!packages) {
        continue;
      }

      packages.forEach((signedPackage) => {
        const signer = signedPackage.packageSigner;
        if (!signerValues.get(signer) && this.isReferenceSigner(signer)) {
          signerValues.set(signer, signedPackage.dataPackage.dataPoints[0].toObj().value);
        }
      });
    }

    const values = Array.from(signerValues.values());
    if (!values.length) {
      this.logger.warn(`Reference values not found ${logDescription}`, { deviationPercent: 0 });

      return 0;
    }

    const medianValue = MathUtils.getMedian(values);

    const deviationPercent = MathUtils.calculateDeviationPercent({
      baseValue: medianValue,
      deviatedValue: dataPackage.dataPoints[0].toObj().value,
    });

    this.logger.debug(
      `Calculated deviationPercent: ${deviationPercent} ${logDescription} of ${values.length} reference signer${RedstoneCommon.getS(values.length)}`,
      { deviationPercent }
    );

    return deviationPercent;
  }
}
