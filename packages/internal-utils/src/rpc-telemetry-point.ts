import {
  NetworkId,
  RedstoneCommon,
  RpcTelemetry,
  sanitizeLogMessage,
} from "@redstone-finance/utils";
import { TelemetryPoint } from "./TelemetrySendService";

const RPC_METRIC_MEASUREMENT = "rpc_provider";

export function createTelemetryPoint(
  op: string,
  networkId: NetworkId,
  url: string,
  isFailure: boolean,
  duration: number
) {
  return new TelemetryPoint(RPC_METRIC_MEASUREMENT)
    .tag("op", op)
    .tag("chainId", networkId.toString())
    .tag("url", sanitizeLogMessage(url))
    .tag("isFailure", isFailure.toString())
    .floatField("duration", duration);
}

export function rpcCallMetricToTelemetryPoint(metric: RpcTelemetry.RpcCallMetric) {
  const point = createTelemetryPoint(
    metric.op,
    metric.networkId,
    metric.url,
    metric.isFailure,
    metric.durationMs
  ).tag("method", metric.method);
  if (RedstoneCommon.isDefined(metric.value)) {
    point.floatField(metric.op, metric.value);
  }

  return point;
}
