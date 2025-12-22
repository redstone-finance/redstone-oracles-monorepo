import { consts, INumericDataPoint } from "@redstone-finance/protocol";
import {
  DataPackagesResponse,
  getDataPackagesTimestamp,
  getDataPointsForDataFeedId,
} from "@redstone-finance/sdk";
import { MathUtils } from "@redstone-finance/utils";
import { utils } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";

export const checkValueDeviationCondition = (
  dataFeedId: string,
  dataPackages: DataPackagesResponse,
  valueFromContract: bigint,
  config: RelayerConfig
) => {
  const logTrace = new ValueDeviationLogTrace();

  let maxDeviation = 0;
  let shouldUpdatePrices = false;
  const timestampMilliseconds = getDataPackagesTimestamp(dataPackages, dataFeedId);
  const dataPoints = getDataPointsForDataFeedId(dataPackages, dataFeedId);
  for (const dataPoint of dataPoints) {
    const dataPointObj = dataPoint.toObj() as INumericDataPoint;

    const valueFromContractAsDecimal = Number(
      utils.formatUnits(
        valueFromContract.toString(),
        dataPointObj.decimals ?? consts.DEFAULT_NUM_VALUE_DECIMALS
      )
    );

    logTrace.addPerDataFeedLog(timestampMilliseconds, valueFromContractAsDecimal, dataPointObj);

    const currentDeviation = calculateDeviation(dataPointObj.value, valueFromContractAsDecimal);

    maxDeviation = Math.max(currentDeviation, maxDeviation);
  }

  const minDeviationPercentage = config.updateTriggers[dataFeedId].deviationPercentage;
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

const calculateDeviation = (valueFromFetchedDataPackage: number, valueFromContract: number) =>
  MathUtils.calculateDeviationPercent({
    deviatedValue: valueFromFetchedDataPackage,
    baseValue: valueFromContract,
  });

class ValueDeviationLogTrace {
  private valueFromContract: number = -1;
  private readonly valuesFromNode: number[] = [];
  private timestamp: number = -1;
  private readonly deviationLogs: {
    maxDeviation: string;
    thresholdDeviation: string;
    dataFeedId?: string;
  }[] = [];
  private readonly warnings: string[] = [];

  addPerDataFeedLog(timestamp: number, valueFromContract: number, dataPoint: INumericDataPoint) {
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
