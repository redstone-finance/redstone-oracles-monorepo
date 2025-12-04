import { getTelemetrySendService } from "@redstone-finance/internal-utils";
import { RelayerConfig } from "./config/RelayerConfig";

export const runNonIterationTelemetry = (relayerConfig: RelayerConfig) =>
  setInterval(() => {
    void getTelemetrySendService(
      relayerConfig.telemetryUrl,
      relayerConfig.telemetryAuthorizationToken
    ).sendAggregatedMetricsBatch();
  }, relayerConfig.telemetryBatchSendingIntervalMs);
