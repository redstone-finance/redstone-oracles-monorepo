import { DataPackagesResponse, getDataPackagesWithFeedIds } from "@redstone-finance/sdk";
import _ from "lodash";
import { RelayerConfig } from "../../config/RelayerConfig";
import { makeDataPackagesRequestParams } from "../../core/make-data-packages-request-params";
import { IterationArgs, MultiFeedUpdatePricesArgs, ShouldUpdateContext } from "../../types";
import { addExtraFeedsToUpdateParams } from "../gas-optimization/add-extra-feeds";
import { shouldUpdateInMultiFeed } from "../should-update-in-multi-feed";

export const getMultiFeedIterationArgs = async (
  context: ShouldUpdateContext,
  relayerConfig: RelayerConfig
) => {
  const { dataFeedsToUpdate, dataFeedsDeviationRatios, heartbeatUpdates, messages } =
    await shouldUpdateInMultiFeed(context, relayerConfig);

  const updateRequestParams = makeDataPackagesRequestParams(
    relayerConfig,
    context.uniqueSignerThreshold,
    dataFeedsToUpdate
  );

  const iterationArgs = {
    shouldUpdatePrices: dataFeedsToUpdate.length > 0,
    args: {
      dataFeedsToUpdate,
      dataFeedsDeviationRatios,
      heartbeatUpdates,
      blockTag: context.blockTag,
      updateRequestParams,
    },
    messages,
  };

  if (iterationArgs.shouldUpdatePrices) {
    addExtraFeedsAndMessagesToUpdateParams(relayerConfig, iterationArgs, context.dataPackages);
  }

  return iterationArgs;
};

function addExtraFeedsAndMessagesToUpdateParams(
  relayerConfig: RelayerConfig,
  iterationArgs: IterationArgs,
  dataPackages: DataPackagesResponse
) {
  const messages = [];

  messages.push({
    message: "Data feeds that require update:",
    args: [[...(iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate]],
  });

  if (relayerConfig.includeAdditionalFeedsForGasOptimization) {
    const message = addExtraFeedsToUpdateParams(
      relayerConfig,
      iterationArgs.args as MultiFeedUpdatePricesArgs
    );
    messages.push({ message });

    const remainingFeedsMessage = addRemainingMultiDataPackageDataFeeds(
      dataPackages,
      relayerConfig.dataFeeds,
      iterationArgs.args.dataFeedsToUpdate
    );

    if (remainingFeedsMessage) {
      messages.push(remainingFeedsMessage);
    }
  }

  messages.push({
    message: "Data feeds to be updated:",
    args: [[...(iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate]],
  });

  iterationArgs.additionalUpdateMessages = messages;
}

function addRemainingMultiDataPackageDataFeeds(
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

  dataFeedsToUpdate.push(...multiPackageAdditionalFeedIds);

  return {
    message: "MultiPackage remaining feeds added: ",
    args: multiPackageAdditionalFeedIds,
  };
}
