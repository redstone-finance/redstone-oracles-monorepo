import { DataPackagesResponse, getDataPackagesWithFeedIds } from "@redstone-finance/sdk";
import _ from "lodash";
import { RelayerConfig } from "../../config/RelayerConfig";
import { makeDataPackagesRequestParams } from "../../core/make-data-packages-request-params";
import { IterationArgs, MultiFeedUpdatePricesArgs, ShouldUpdateContext } from "../../types";
import { getExtraFeedsToUpdateParams } from "../gas-optimization/get-extra-feeds";
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

  const iterationArgs: IterationArgs = {
    shouldUpdatePrices: dataFeedsToUpdate.length > 0,
    args: {
      dataFeedsToUpdate,
      dataFeedsDeviationRatios,
      heartbeatUpdates,
      blockTag: context.blockTag,
      updateRequestParams,
    } as MultiFeedUpdatePricesArgs,
    messages,
  };

  if (iterationArgs.shouldUpdatePrices) {
    const { messages: additionalMessages, additionalDataFeedsToUpdate } =
      getExtraFeedsAndMessagesToUpdateParams(relayerConfig, iterationArgs, context.dataPackages);

    iterationArgs.additionalUpdateMessages = additionalMessages;
    iterationArgs.args.dataFeedsToUpdate.push(...additionalDataFeedsToUpdate);

    iterationArgs.additionalUpdateMessages.push({
      message: "Data feeds to be updated:",
      args: [[...iterationArgs.args.dataFeedsToUpdate]],
    });
  }

  return iterationArgs;
};

function getExtraFeedsAndMessagesToUpdateParams(
  relayerConfig: RelayerConfig,
  iterationArgs: IterationArgs,
  dataPackages: DataPackagesResponse
) {
  const messages = [];
  const additionalDataFeedsToUpdate: string[] = [];
  const multiFeedArgs = iterationArgs.args as MultiFeedUpdatePricesArgs;

  messages.push({
    message: "Data feeds that require update:",
    args: [[...multiFeedArgs.dataFeedsToUpdate]],
  });

  if (relayerConfig.includeAdditionalFeedsForGasOptimization) {
    const { message, extraFeedsToUpdate } = getExtraFeedsToUpdateParams(
      relayerConfig,
      multiFeedArgs
    );
    additionalDataFeedsToUpdate.push(...extraFeedsToUpdate);
    messages.push({ message });

    const remainingFeedsMessage = getRemainingMultiDataPackageDataFeeds(
      dataPackages,
      relayerConfig.dataFeeds,
      [...multiFeedArgs.dataFeedsToUpdate, ...extraFeedsToUpdate]
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
