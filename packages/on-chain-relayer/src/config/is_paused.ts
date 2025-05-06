import { RedstoneCommon } from "@redstone-finance/utils";

export const MAX_PAUSE_FUTURE_TIMESTAMP_HOURS = 8;
const MAX_PAUSE_FUTURE_TIMESTAMP = RedstoneCommon.hourToMs(
  MAX_PAUSE_FUTURE_TIMESTAMP_HOURS
);

export function isPaused(relayerConfig: { isPausedUntil?: Date }) {
  const pausedUntilTimestamp = relayerConfig.isPausedUntil?.getTime();

  if (!pausedUntilTimestamp) {
    return false;
  }

  const now = Date.now();

  if (pausedUntilTimestamp > now + MAX_PAUSE_FUTURE_TIMESTAMP) {
    return false;
  }

  return now <= pausedUntilTimestamp;
}
