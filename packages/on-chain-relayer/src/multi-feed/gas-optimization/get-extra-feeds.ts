import _ from "lodash";
import { RelayerConfig } from "../../config/RelayerConfig";
import { MultiFeedUpdatePricesArgs } from "../../types";
import { includeFeedsCloseToDeviation } from "./feeds-close-to-deviation";
import { includeSynchronizedHeartbeatUpdates } from "./heartbeat-sync";

export const getExtraFeedsToUpdateParams = (
  relayerConfig: RelayerConfig,
  args: MultiFeedUpdatePricesArgs
): { extraFeedsToUpdate: string[]; message: string } => {
  const { dataFeedsToUpdate, dataFeedsDeviationRatios, heartbeatUpdates } = args;
  const { extraFeedsFromDeviation, message: deviationMessage } = includeFeedsCloseToDeviation(
    dataFeedsToUpdate,
    dataFeedsDeviationRatios,
    relayerConfig
  );
  const { extraFeedsFromHeartbeat, message: heartbeatMessage } =
    includeSynchronizedHeartbeatUpdates(dataFeedsToUpdate, heartbeatUpdates, relayerConfig);
  const extraFeedsToUpdate: string[] = _.uniq([
    ...extraFeedsFromDeviation,
    ...extraFeedsFromHeartbeat,
  ]);
  const message =
    extraFeedsToUpdate.length > 0
      ? `Additional feeds included in the update to optimize gas:\n${[deviationMessage, heartbeatMessage].filter(Boolean).join("\n")}`
      : "No additional feeds were included in the update.";

  return { extraFeedsToUpdate, message };
};
