import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import { canIgnoreMissingFeeds } from "../core/make-data-packages-request-params";
import { checkConditionByName } from "../core/update-conditions/check-condition-by-name";
import { checkIfDataPackageTimestampIsNewer } from "../core/update-conditions/data-packages-timestamp";
import {
  IterationArgsMessage,
  ShouldUpdateContext,
  ShouldUpdateResponse,
} from "../types";

export const shouldUpdateInMultiFeed = async (
  context: ShouldUpdateContext,
  config: RelayerConfig
): Promise<ShouldUpdateResponse> => {
  const dataFeedsToUpdate: string[] = [];
  const warningMessages: IterationArgsMessage[] = [];
  const infoMessages: IterationArgsMessage[] = [];
  const dataFeedsDeviationRatios: Record<string, number> = {};
  const heartbeatUpdates: Set<number> = new Set();
  const pictogram = config.runWithMqtt ? "ℹ️" : "⛔";
  const missingDataFeedIds = [];
  for (const [dataFeedId, updateConditions] of Object.entries(
    config.updateConditions
  )) {
    if (!Object.keys(context.dataPackages).includes(dataFeedId)) {
      missingDataFeedIds.push(dataFeedId);
      continue;
    }
    let shouldUpdatePrices = false;
    for (const conditionName of updateConditions) {
      try {
        const conditionCheck = await checkConditionByName(
          conditionName,
          dataFeedId,
          context,
          config
        );
        shouldUpdatePrices ||= conditionCheck.shouldUpdatePrices;
        if (conditionCheck.shouldUpdatePrices) {
          warningMessages.push(...conditionCheck.messages);
        } else {
          infoMessages.push(...conditionCheck.messages);
        }

        if (conditionCheck.maxDeviationRatio) {
          dataFeedsDeviationRatios[dataFeedId] =
            conditionCheck.maxDeviationRatio;
        }
        if (conditionCheck.shouldUpdatePrices && conditionName === "time") {
          heartbeatUpdates.add(
            config.updateTriggers[dataFeedId].timeSinceLastUpdateInMilliseconds!
          );
        }
      } catch (error) {
        if (canIgnoreMissingFeeds(config)) {
          warningMessages.push({
            message: `${pictogram} ${dataFeedId}/${conditionName}: ${RedstoneCommon.stringifyError(error)}`,
            args: [error],
          });
        } else {
          throw error;
        }
      }
    }

    const { shouldNotUpdatePrice, messages } =
      checkIfDataPackageTimestampIsNewer(context, dataFeedId);
    if (shouldNotUpdatePrice) {
      shouldUpdatePrices = false;
      warningMessages.push(...messages);
    }

    if (shouldUpdatePrices) {
      dataFeedsToUpdate.push(dataFeedId);
    }
  }

  if (missingDataFeedIds.length) {
    warningMessages.unshift({
      message: `${pictogram}Missing data package for feed${RedstoneCommon.getS(missingDataFeedIds.length)}: ${missingDataFeedIds.toString()}${pictogram}`,
      args: [{ missingDataFeedIds }],
    });
  }

  return {
    dataFeedsToUpdate,
    dataFeedsDeviationRatios,
    heartbeatUpdates: Array.from(heartbeatUpdates),
    messages: [...warningMessages, ...infoMessages],
  };
};
