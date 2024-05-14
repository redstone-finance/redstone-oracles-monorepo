import { consts, INumericDataPoint } from "@redstone-finance/protocol";
import {
  DataPackagesResponse,
  ValuesForDataFeeds,
} from "@redstone-finance/sdk";
import { MathUtils } from "@redstone-finance/utils";
import { BigNumber, utils } from "ethers";
import { RelayerConfig } from "../../types";
import { chooseDataPackagesTimestamp } from "./data-packages-timestamp";

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
      const dataPackageName = dataPackage!.dataPackage.dataFeedId!;

      if (!dataPackagesPerDataFeedId[dataFeedId]) {
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
  dataPackages: DataPackagesResponse,
  valuesFromContract: ValuesForDataFeeds,
  config: RelayerConfig
) => {
  const logTrace = new ValueDeviationLogTrace();

  let maxDeviation = 0;
  let shouldUpdatePrices = false;
  const warnings = verifyDataPackagesAreDisjoint(dataPackages);
  logTrace.addWarnings(warnings);
  const timestampMilliseconds = chooseDataPackagesTimestamp(dataPackages);
  for (const dataFeedId of config.dataFeeds) {
    const valueFromContract =
      valuesFromContract[dataFeedId] ?? BigNumber.from(0);
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

      if (config.priceFeedsDeviationOverrides?.[dataFeedId]) {
        shouldUpdatePrices ||=
          currentDeviation >= config.priceFeedsDeviationOverrides[dataFeedId];
        logTrace.addDeviationInfo(
          currentDeviation,
          config.priceFeedsDeviationOverrides[dataFeedId],
          dataFeedId
        );
      } else {
        maxDeviation = Math.max(currentDeviation, maxDeviation);
      }
    }
  }

  const { minDeviationPercentage } = config;
  shouldUpdatePrices ||= maxDeviation >= minDeviationPercentage!;
  logTrace.addDeviationInfo(maxDeviation, minDeviationPercentage!);

  return {
    shouldUpdatePrices,
    warningMessage: shouldUpdatePrices
      ? `Value has deviated enough to be updated. ${logTrace.toString()}`
      : `Value has not deviated enough to be updated. ${logTrace.toString()}`,
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
  private perDataFeedId: Record<
    string,
    | {
        valueFromContract: number;
        valuesFromNode: number[];
        timestamp: number;
      }
    | undefined
  > = {};
  private deviationLogs: {
    maxDeviation: string;
    thresholdDeviation: string;
    dataFeedId?: string;
  }[] = [];
  private warnings: string[] = [];

  addPerDataFeedLog(
    timestamp: number,
    valueFromContract: number,
    dataPoint: INumericDataPoint
  ) {
    const dataFeedId = dataPoint.dataFeedId;
    const perData = this.perDataFeedId[dataFeedId];
    if (!perData) {
      this.perDataFeedId[dataFeedId] = {
        valueFromContract: valueFromContract,
        valuesFromNode: [dataPoint.value],
        timestamp,
      };
    } else {
      perData.valuesFromNode.push(dataPoint.value);
    }
  }

  addDeviationInfo(
    maxDeviation: number,
    thresholdDeviation: number,
    dataFeedId?: string
  ) {
    this.deviationLogs.push({
      maxDeviation: maxDeviation.toFixed(4),
      thresholdDeviation: thresholdDeviation.toFixed(4),
      dataFeedId,
    });
  }

  addWarnings(warnings: string[]) {
    this.warnings.push(...warnings);
  }

  toString(): string {
    return JSON.stringify({
      ...this.perDataFeedId,
      ...this.deviationLogs,
      ...(this.warnings.length ? { warnings: this.warnings } : {}),
    });
  }
}
