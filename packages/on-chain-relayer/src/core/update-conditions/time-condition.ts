import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";

export const timeUpdateCondition = (
  dataFeedId: string,
  lastUpdateTimestamp: number,
  config: RelayerConfig
) => {
  const { fallbackOffsetInMilliseconds } = config;
  const isFallback = fallbackOffsetInMilliseconds > 0;
  let updatePriceInterval = config.updateTriggers[dataFeedId].timeSinceLastUpdateInMilliseconds;

  if (!RedstoneCommon.isDefined(updatePriceInterval)) {
    throw new Error("Update price interval must be defined");
  }

  if (isFallback) {
    updatePriceInterval += fallbackOffsetInMilliseconds;
  }

  const currentTimestamp = Date.now();
  const timeDiff = currentTimestamp - lastUpdateTimestamp;
  const shouldUpdatePrices = timeDiff >= updatePriceInterval;
  const logTrace = JSON.stringify({
    timeDiff,
    updatePriceInterval,
  });

  const warningMessage = shouldUpdatePrices
    ? `Enough time has passed to update prices: ${dataFeedId} ${logTrace}`
    : `Not enough time has passed to update prices: ${dataFeedId} ${logTrace}`;

  return {
    shouldUpdatePrices,
    messages: [
      {
        message: `${isFallback ? "Time in fallback mode: " : ""}${warningMessage}`,
      },
    ],
  };
};
