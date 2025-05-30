import { consts, INumericDataPoint } from "@redstone-finance/protocol";
import {
  DataPackagesResponse,
  getDataPackagesTimestamp,
} from "@redstone-finance/sdk";
import { MathUtils } from "@redstone-finance/utils";
import { BigNumber, utils } from "ethers";

import { RelayerConfig } from "../../config/RelayerConfig";

const getDataPointsForDataFeedId = (
  dataPackages: DataPackagesResponse,
  dataFeedId: string
) =>
  Object.values(dataPackages)
    .flat()
    .flatMap((dataPackage) => dataPackage!.dataPackage.dataPoints)
    .filter((dataPoint) => dataPoint.dataFeedId === dataFeedId);

const verifyDataPackagesAreDisjoint = (dataPackages: DataPackagesResponse) => {
  const dataPackagesPerDataFeedId: Partial<Record<string, string>> = {};
  const warnings = [];
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
        warnings.push(
          `Potential misconfiguration detected! Data feed ${dataFeedId} included in two packages: ${dataPackageName} and ${dataPackagesPerDataFeedId[dataFeedId]}`
        );
      }
    }
  }
  return warnings;
};

export const checkValueDeviationCondition = (
  dataFeedId: string,
  dataPackages: DataPackagesResponse,
  valueFromContract: BigNumber,
  config: RelayerConfig
) => {
  const logTrace = new ValueDeviationLogTrace();

  let maxDeviation = 0;
  let shouldUpdatePrices = false;
  const warnings = verifyDataPackagesAreDisjoint(dataPackages);
  logTrace.addWarnings(warnings);
  const timestampMilliseconds = getDataPackagesTimestamp(
    dataPackages,
    dataFeedId
  );
  const dataPoints = getDataPointsForDataFeedId(dataPackages, dataFeedId);
  for (const dataPoint of dataPoints) {
    const dataPointObj = dataPoint.toObj() as INumericDataPoint;

    const valueFromContractAsDecimal = Number(
      utils.formatUnits(
        valueFromContract.toString(),
        dataPointObj.decimals ?? consts.DEFAULT_NUM_VALUE_DECIMALS
      )
    );

    logTrace.addPerDataFeedLog(
      timestampMilliseconds,
      valueFromContractAsDecimal,
      dataPointObj
    );

    const currentDeviation = calculateDeviation(
      dataPointObj.value,
      valueFromContractAsDecimal
    );

    maxDeviation = Math.max(currentDeviation, maxDeviation);
  }

  const minDeviationPercentage =
    config.updateTriggers[dataFeedId].deviationPercentage;
  shouldUpdatePrices ||= maxDeviation >= minDeviationPercentage!;
  logTrace.addDeviationInfo(maxDeviation, minDeviationPercentage!);

  return {
    shouldUpdatePrices,
    maxDeviationRatio: maxDeviation / minDeviationPercentage!,
    warningMessage: shouldUpdatePrices
      ? `Value has deviated enough to be updated: ${dataFeedId} ${logTrace.toString()}`
      : `Value has not deviated enough to be updated: ${dataFeedId} ${logTrace.toString()}`,
  };
};

const calculateDeviation = (
  valueFromFetchedDataPackage: number,
  valueFromContract: number
) =>
  MathUtils.calculateDeviationPercent({
    deviatedValue: valueFromFetchedDataPackage,
    baseValue: valueFromContract,
  });

class ValueDeviationLogTrace {
  private dataFeedId: string = "";
  private valueFromContract: number = -1;
  private readonly valuesFromNode: number[] = [];
  private timestamp: number = -1;
  private readonly deviationLogs: {
    maxDeviation: string;
    thresholdDeviation: string;
    dataFeedId?: string;
  }[] = [];
  private readonly warnings: string[] = [];

  addPerDataFeedLog(
    timestamp: number,
    valueFromContract: number,
    dataPoint: INumericDataPoint
  ) {
    this.dataFeedId = dataPoint.dataFeedId;
    this.valueFromContract = valueFromContract;
    this.timestamp = timestamp;
    this.valuesFromNode.push(dataPoint.value);
  }

  addDeviationInfo(maxDeviation: number, thresholdDeviation: number) {
    this.deviationLogs.push({
      maxDeviation: maxDeviation.toFixed(4),
      thresholdDeviation: thresholdDeviation.toFixed(4),
    });
  }

  addWarnings(warnings: string[]) {
    this.warnings.push(...warnings);
  }

  toString(): string {
    return JSON.stringify({
      valueFromContract: this.valueFromContract,
      timestamp: this.timestamp,
      valuesFromNode: this.valuesFromNode,
      deviationLogs: this.deviationLogs,
      ...(this.warnings.length ? { warnings: this.warnings } : {}),
    });
  }
}
