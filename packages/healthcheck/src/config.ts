import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

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
