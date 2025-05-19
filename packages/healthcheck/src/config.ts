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
  });

export function enableWithDefaultConfig() {
  const hcConfig = healthcheckConfig();
  if (hcConfig.enabled) {
    const healthChecks = new Map<string, HealthCheck>();
    healthChecks.set(
      "resources-healthcheck",
      new ResourcesHealthCheck({
        memoryPercent: hcConfig.memoryUsagePercentThreshold,
        gracePeriodMs: RedstoneCommon.minToMs(5),
      })
    );
    new HealthMonitor(healthChecks, 10_000);
  }
}
