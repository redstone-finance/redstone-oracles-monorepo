import { LogMonitoring, LogMonitoringType } from "@redstone-finance/internal-utils";
import { INumericDataPoint } from "@redstone-finance/protocol";
import { DataPackagesResponse, getDataPointsForDataFeedId } from "@redstone-finance/sdk";
import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";

const getPricesMedian = (dataPackages: DataPackagesResponse, feedId: string) => {
  const dataPoints = getDataPointsForDataFeedId(dataPackages, feedId);
  if (!dataPoints.length) {
    return undefined;
  }

  return MathUtils.getMedian(dataPoints.map((dp) => (dp.toObj() as INumericDataPoint).value));
};

export const fundamentalRateDependentCondition = (
  dataFeedId: string,
  dataPackages: DataPackagesResponse,
  lastBlockTimestampMS: number,
  config: RelayerConfig
) => {
  const fundamentalRateDependentConfig = config.updateTriggers[dataFeedId].fundamentalRateDependent;

  if (!fundamentalRateDependentConfig) {
    return {
      shouldUpdatePrices: false,
      messages: [
        {
          message: `fundamental-rate-dependent: missing config for ${dataFeedId}`,
        },
      ],
    };
  }

  const { fundamentalToken, acceptableDepegPercentage, heartbeatInDepegModeInMs } =
    fundamentalRateDependentConfig;

  const marketPrice = getPricesMedian(dataPackages, dataFeedId);
  const fundamentalPrice = getPricesMedian(dataPackages, fundamentalToken);

  if (!RedstoneCommon.isDefined(marketPrice) || !RedstoneCommon.isDefined(fundamentalPrice)) {
    return {
      shouldUpdatePrices: false,
      messages: [
        {
          message: `fundamental-rate-dependent: missing data packages for ${dataFeedId} (market=${marketPrice}) or ${fundamentalToken} (fundamental=${fundamentalPrice})`,
        },
      ],
    };
  }

  const deviation = MathUtils.calculateDeviationPercent({
    deviatedValue: marketPrice,
    baseValue: fundamentalPrice,
  });

  const logTrace = JSON.stringify({
    dataFeedId,
    fundamentalToken,
    marketPrice,
    fundamentalPrice,
    deviation: deviation.toFixed(4),
    acceptableDepegPercentage,
  });

  if (deviation <= acceptableDepegPercentage) {
    return {
      shouldUpdatePrices: false,
      messages: [{ message: `Not depegged: ${logTrace}` }],
    };
  }

  const timeDiff = Date.now() - lastBlockTimestampMS;
  const shouldUpdatePrices = timeDiff >= heartbeatInDepegModeInMs;

  if (shouldUpdatePrices) {
    LogMonitoring.error(
      LogMonitoringType.FUNDAMENTAL_RATE_DEPENDENT_DEPEG,
      `market token ${dataFeedId} depegged from fundamental ${fundamentalToken} by ${deviation} and heartbeat elapsed - acceptable diff ${acceptableDepegPercentage}, heartbeat ${heartbeatInDepegModeInMs}`
    );
  }

  return {
    shouldUpdatePrices,
    messages: [
      {
        message: `Depegged: ${
          shouldUpdatePrices ? "heartbeat triggered" : "heartbeat not yet reached"
        } timeDiff=${timeDiff}ms threshold=${heartbeatInDepegModeInMs}ms ${logTrace}`,
      },
    ],
  };
};
