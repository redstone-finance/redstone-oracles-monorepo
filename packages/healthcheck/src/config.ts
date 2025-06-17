import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { HealthCheck, HealthMonitor, ResourcesHealthCheck } from "./monitor";

export const healthcheckConfig = () =>
  Object.freeze({
    enabled: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_ENABLED",
      z.boolean().default(false)
    ),
    memoryUsagePercentThreshold: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_MEMORY_USAGE_PERCENT_THRESHOLD",
      z.number().default(95)
    ),
    intervalMs: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_RUN_INTERVAL_MS",
      z.number().default(10_000)
    ),
  });

/**
 * Enables health check monitoring with a default memory usage check
 * @param additionalChecks - additional checks to be attached
 */
export function enableWithDefaultConfig(
  additionalChecks: Map<string, HealthCheck> = new Map()
) {
  const hcConfig = healthcheckConfig();
  if (hcConfig.enabled) {
    additionalChecks.set(
      "resources-healthcheck",
      new ResourcesHealthCheck({
        memoryPercent: hcConfig.memoryUsagePercentThreshold,
        gracePeriodMs: RedstoneCommon.minToMs(5),
      })
    );
    new HealthMonitor(additionalChecks, hcConfig.intervalMs);
  }
}
