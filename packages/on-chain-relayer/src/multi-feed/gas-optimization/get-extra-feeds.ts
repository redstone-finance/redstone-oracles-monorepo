import { RelayerConfig } from "../../config/RelayerConfig";
import { MultiFeedUpdatePricesArgs } from "../../types";
import { includeFeedsCloseToDeviation } from "./feeds-close-to-deviation";
import { includeSynchronizedHeartbeatUpdates } from "./heartbeat-sync";

export const getExtraFeedsToUpdateParams = (
  relayerConfig: RelayerConfig,
  args: MultiFeedUpdatePricesArgs
) => {
  const { dataFeedsToUpdate, dataFeedsDeviationRatios, heartbeatUpdates } = args;
  const { message: deviationMessage, extraFeedsFromDeviation } = includeFeedsCloseToDeviation(
    dataFeedsToUpdate,
    dataFeedsDeviationRatios,
    relayerConfig
  );

  const { message: heartbeatMessage, extraFeedsFromHeartbeat } =
    includeSynchronizedHeartbeatUpdates(dataFeedsToUpdate, heartbeatUpdates, relayerConfig);

  const message =
    extraFeedsFromDeviation.length > 0 || extraFeedsFromHeartbeat.length > 0
      ? "Additional feeds included in the update to optimize gas: " +
        deviationMessage +
        "\n" +
        heartbeatMessage
      : "No additional feeds were included in the update.";

  const uniqueExtraFeedsToUpdate = [
    ...new Set([...extraFeedsFromDeviation, ...extraFeedsFromHeartbeat]),
  ];

  return {
    message,
    extraFeedsToUpdate: uniqueExtraFeedsToUpdate,
  };
};
