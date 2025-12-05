import { RelayerConfig } from "..";

export const isRelayerTelemetryEnabled = (config: RelayerConfig) => {
  return (
    !!config.telemetryAuthorizationToken &&
    !!config.telemetryUrl &&
    !!config.telemetryBatchSendingIntervalMs
  );
};
