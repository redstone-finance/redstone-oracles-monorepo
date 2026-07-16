import {
  getTelemetrySendService,
  rpcCallMetricToTelemetryPoint,
  TelemetryPoint,
} from "@redstone-finance/internal-utils";
import { RedstoneCommon, RpcTelemetry } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

export function getRelayerMetricReporter(relayerConfig: PartialRelayerConfig) {
  const telemetrySendService = getTelemetrySendService(
    relayerConfig.telemetryUrl,
    relayerConfig.telemetryAuthorizationToken
  );

  return (point: TelemetryPoint) => {
    point
      .tag("relayer-network-id", relayerConfig.networkId.toString())
      .tag("relayer-adapter-address", relayerConfig.adapterContractAddress);
    if (RedstoneCommon.isDefined(relayerConfig.fallbackOffsetInMilliseconds)) {
      point.tag("relayer-fallback-offset", relayerConfig.fallbackOffsetInMilliseconds.toString());
    }
    telemetrySendService.queueToSendMetric(point);
  };
}

export function getRelayerRpcMetricReporter(
  relayerConfig: PartialRelayerConfig
): RpcTelemetry.RpcMetricReporter {
  const report = getRelayerMetricReporter(relayerConfig);

  return (metric) => report(rpcCallMetricToTelemetryPoint(metric));
}
