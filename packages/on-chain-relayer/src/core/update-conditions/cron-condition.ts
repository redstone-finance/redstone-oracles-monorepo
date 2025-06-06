import { parseExpression } from "cron-parser";

import { RelayerConfig } from "../../config/RelayerConfig";

export const cronCondition = (
  dataFeedId: string,
  lastUpdateTimestamp: number,
  config: RelayerConfig
) => {
  const currentTimestamp = Date.now();
  const warningMessages: string[] = [];
  let shouldUpdatePrices = false;
  for (const cronExpression of config.updateTriggers[dataFeedId].cron ?? []) {
    const cronCheck = checkCronCondition(
      cronExpression,
      currentTimestamp,
      lastUpdateTimestamp,
      config,
      dataFeedId
    );

    shouldUpdatePrices ||= cronCheck.shouldUpdatePrices;
    if (cronCheck.warningMessage.length > 0) {
      warningMessages.push(cronCheck.warningMessage);
    }
  }
  return {
    shouldUpdatePrices,
    messages: warningMessages.map((message) => ({ message })),
  };
};

const checkCronCondition = (
  cronExpression: string,
  currentTimestamp: number,
  lastUpdateTimestamp: number,
  config: RelayerConfig,
  dataFeedId: string
) => {
  const interval = parseExpression(cronExpression, {
    // We move current time a bit back for the case with fallback
    currentDate: new Date(
      currentTimestamp - config.fallbackOffsetInMilliseconds
    ),
    utc: true,
  });
  const lastExpectedUpdateTime = interval.prev().getTime();
  const nextExpectedUpdateTime = interval.next().getTime();

  // We want to update price only if there are no update txs after the previous
  // suitable time
  const shouldUpdatePrices = lastExpectedUpdateTime > lastUpdateTimestamp;

  const logTrace = JSON.stringify({
    timeSinceLastUpdate: currentTimestamp - lastUpdateTimestamp,
    timeSinceLastExpectedUpdate: currentTimestamp - lastExpectedUpdateTime,
    timeToNextExpectedUpdate: nextExpectedUpdateTime - currentTimestamp,
  });

  const warningMessage = shouldUpdatePrices
    ? `Should update prices according to cron expr: ${dataFeedId} ${logTrace}`
    : `Should not update prices according to cron expr: ${dataFeedId} ${logTrace}`;

  return {
    shouldUpdatePrices,
    warningMessage,
  };
};
