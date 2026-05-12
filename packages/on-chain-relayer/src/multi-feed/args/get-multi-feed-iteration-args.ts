import { DataPackagesResponse, getDataPackagesWithFeedIds } from "@redstone-finance/sdk";
import _ from "lodash";
import { RelayerConfig } from "../../config/RelayerConfig";
import { makeDataPackagesRequestParams } from "../../core/make-data-packages-request-params";
import { MultiFeedIterationArgs, ShouldUpdateContext } from "../../types";
import { getExtraFeedsToUpdateParams } from "../gas-optimization/get-extra-feeds";
import { shouldUpdateInMultiFeed } from "../should-update-in-multi-feed";

export const getMultiFeedIterationArgs = async (
  context: ShouldUpdateContext,
  relayerConfig: RelayerConfig
) => {
  const {
    dataFeedsToUpdate,
    dataFeedsDeviationRatios,
    heartbeatUpdates,
    messages,
    missingDataFeedIds,
  } = await shouldUpdateInMultiFeed(context, relayerConfig);

  const updateRequestParams = makeDataPackagesRequestParams(
    relayerConfig,
    context.uniqueSignerThreshold,
    dataFeedsToUpdate
  );

  const iterationArgs: MultiFeedIterationArgs = {
    shouldUpdatePrices: dataFeedsToUpdate.length > 0,
    args: {
      dataFeedsToUpdate,
      dataFeedsDeviationRatios,
      heartbeatUpdates,
      blockTag: context.blockTag,
      updateRequestParams,
      missingDataFeedIds,
    },
    messages,
  };

  if (iterationArgs.shouldUpdatePrices) {
    const { messages, additionalDataFeedsToUpdate } = getExtraFeedsAndMessagesToUpdateParams(
      relayerConfig,
      iterationArgs,
      context.dataPackages
    );

    iterationArgs.additionalUpdateMessages = messages;
    iterationArgs.args.dataFeedsToUpdate.push(...additionalDataFeedsToUpdate);

    const feedsToRemove = getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(
      iterationArgs.args.dataFeedsToUpdate,
      iterationArgs.args.missingDataFeedIds,
      relayerConfig
    );

    iterationArgs.args.dataFeedsToUpdate = iterationArgs.args.dataFeedsToUpdate.filter(
      (feed) => !feedsToRemove.includes(feed)
    );
    iterationArgs.shouldUpdatePrices = iterationArgs.args.dataFeedsToUpdate.length > 0;

    iterationArgs.additionalUpdateMessages.push({
      message: "Data feeds to be updated:",
      args: [[...iterationArgs.args.dataFeedsToUpdate]],
    });
  }

  return iterationArgs;
};

function getExtraFeedsAndMessagesToUpdateParams(
  relayerConfig: RelayerConfig,
  iterationArgs: MultiFeedIterationArgs,
  dataPackages: DataPackagesResponse
) {
  const messages = [];
  const additionalDataFeedsToUpdate: string[] = [];

  messages.push({
    message: "Data feeds that require update:",
    args: [[...iterationArgs.args.dataFeedsToUpdate]],
  });

  if (relayerConfig.includeAdditionalFeedsForGasOptimization) {
    const { message, extraFeedsToUpdate } = getExtraFeedsToUpdateParams(
      relayerConfig,
      iterationArgs.args
    );
    additionalDataFeedsToUpdate.push(...extraFeedsToUpdate);
    messages.push({ message });

    const remainingFeedsMessage = getRemainingMultiDataPackageDataFeeds(
      dataPackages,
      relayerConfig.dataFeeds,
      [...iterationArgs.args.dataFeedsToUpdate, ...extraFeedsToUpdate]
    );

    if (remainingFeedsMessage) {
      messages.push(remainingFeedsMessage);
      additionalDataFeedsToUpdate.push(...remainingFeedsMessage.args);
    }
  }

  return {
    messages,
    additionalDataFeedsToUpdate,
  };
}

function getRemainingMultiDataPackageDataFeeds(
  dataPackages: DataPackagesResponse,
  allowedDataFeedIds: string[],
  dataFeedsToUpdate: string[]
) {
  const packagesWithFeeds = Object.values(getDataPackagesWithFeedIds(dataPackages, true)).filter(
    ({ feedIds }) => feedIds.some((feedId) => dataFeedsToUpdate.includes(feedId))
  );

  const multiPackageAdditionalFeedIds = _.uniq(
    packagesWithFeeds.flatMap(({ feedIds }) =>
      feedIds.filter((feedId) => allowedDataFeedIds.includes(feedId))
    )
  ).filter((feedId) => !dataFeedsToUpdate.includes(feedId));

  if (!multiPackageAdditionalFeedIds.length) {
    return undefined;
  }

  return {
    message: "MultiPackage remaining feeds added: ",
    args: multiPackageAdditionalFeedIds,
  };
}

export function getFeedsToRemoveIfMissingFeedToBeUpdatedTogether(
  dataFeedsToUpdate: string[],
  missingDataFeedIds: string[],
  relayerConfig: RelayerConfig
) {
  const feedsToRemove: string[] = [];
  if (!relayerConfig.feedsToBeUpdatedTogether) {
    return feedsToRemove;
  }

  return relayerConfig.feedsToBeUpdatedTogether
    .filter(
      (tokensUpdatedTogether) =>
        !tokensUpdatedTogether.every(
          (token) => dataFeedsToUpdate.includes(token) && !missingDataFeedIds.includes(token)
        )
    )
    .flat();
}
