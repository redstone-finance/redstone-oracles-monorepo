import { makeDataPackagesRequestParams } from "../../core/make-data-packages-request-params";
import {
  IterationArgs,
  MultiFeedUpdatePricesArgs,
  RelayerConfig,
  ShouldUpdateContext,
} from "../../types";
import { addExtraFeedsToUpdateParams } from "../gas-optimization/add-extra-feeds";
import { shouldUpdateInMultiFeed } from "../should-update-in-multi-feed";

export const getMultiFeedIterationArgs = async (
  context: ShouldUpdateContext,
  relayerConfig: RelayerConfig
) => {
  const {
    dataFeedsToUpdate,
    dataFeedsDeviationRatios,
    heartbeatUpdates,
    warningMessage: message,
  } = await shouldUpdateInMultiFeed(context, relayerConfig);

  const updateRequestParams = makeDataPackagesRequestParams(
    relayerConfig,
    context.uniqueSignersThreshold,
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
    message,
  };

  if (iterationArgs.shouldUpdatePrices) {
    addExtraFeedsAndMessagesToUpdateParams(iterationArgs);
  }

  return iterationArgs;
};

function addExtraFeedsAndMessagesToUpdateParams(iterationArgs: IterationArgs) {
  const messages = [];

  messages.push({
    message: "Data feeds that require update:",
    args: [
      [...(iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate],
    ],
  });
  const message = addExtraFeedsToUpdateParams(
    iterationArgs.args as MultiFeedUpdatePricesArgs
  );
  messages.push({ message });
  messages.push({
    message: "Data feeds to be updated:",
    args: [
      [...(iterationArgs.args as MultiFeedUpdatePricesArgs).dataFeedsToUpdate],
    ],
  });

  iterationArgs.additionalMessages = messages;
}