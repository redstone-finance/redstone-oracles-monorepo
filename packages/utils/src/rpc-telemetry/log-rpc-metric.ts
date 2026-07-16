import { loggerFactory, RedstoneLogger } from "../logger";
import { RpcMetricReporter } from "./TelemetryFnDelegate";

let logger: RedstoneLogger | undefined;
export const logRpcMetric: RpcMetricReporter = (metric) => {
  logger ??= loggerFactory("rpc-telemetry");
  logger.debug(
    `<${metric.op}> on ${metric.networkId}: ${metric.durationMs.toFixed(1)} [ms] ` +
      `${metric.isFailure ? "failure" : "success"}`,
    metric
  );
};
