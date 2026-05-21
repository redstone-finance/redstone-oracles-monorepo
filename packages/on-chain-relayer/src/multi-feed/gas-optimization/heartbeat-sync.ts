import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../../config/RelayerConfig";

export const includeSynchronizedHeartbeatUpdates = (
  dataFeedsToUpdate: string[],
  heartbeatUpdates: number[],
  config: RelayerConfig
) => {
  const { multiFeedSyncHeartbeats } = config;
  const filteredHeartbeatUpdates = heartbeatUpdates.filter((hb) => hb !== 0);
  if (!multiFeedSyncHeartbeats || filteredHeartbeatUpdates.length === 0) {
    return {
      dataFeedsToUpdate,
      message: "",
    };
  }
  const { dataFeeds, updateTriggers } = config;
  const messages: string[] = [];
  for (const dataFeedId of dataFeeds) {
    if (
      !RedstoneCommon.isDefined(updateTriggers[dataFeedId].timeSinceLastUpdateInMilliseconds) ||
      dataFeedsToUpdate.includes(dataFeedId)
    ) {
      continue;
    }
    for (const heartbeat of filteredHeartbeatUpdates) {
      if (
        updateTriggers[dataFeedId].timeSinceLastUpdateInMilliseconds === 0 ||
        heartbeat % updateTriggers[dataFeedId].timeSinceLastUpdateInMilliseconds === 0
      ) {
        messages.push(
          `DataFeed: ${dataFeedId} included due to heartbeat syncing (${heartbeat} [ms])`
        );
        dataFeedsToUpdate.push(dataFeedId);
        break;
      }
    }
  }
  return {
    dataFeedsToUpdate,
    message: messages.join("; "),
  };
};
