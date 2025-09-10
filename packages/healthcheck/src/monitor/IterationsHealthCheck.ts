import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { type HealthCheck, type HealthCheckResult, healthy, unhealthy } from "./common";

const logger = loggerFactory("IterationHealthCheck");

/**
 * Health check implementation that monitors when the last iteration
 * has occurred.
 *
 * This health check is useful for ensuring that a background process
 * or loop is running with expected frequency and consistency.
 *
 * Environment variables used (must be set):
 * - `HEALTHCHECK_ITERATION_PERIOD_S`: Period (in seconds) during which iteration should occur.
 */
export class IterationsHealthCheck implements HealthCheck {
  private readonly params = Object.freeze({
    periodInS: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_ITERATION_PERIOD_S",
      z.number() // no sane default
    ),
  });

  private readonly startDate = new Date();
  private lastIterationDate: Date | null = null;

  check(fireDate: Date): Promise<HealthCheckResult> {
    const { periodInS } = this.params;
    const referenceDate = this.lastIterationDate ?? this.startDate;
    const elapsed = IterationsHealthCheck.secondsBetween(referenceDate, fireDate);
    const isStartup = !RedstoneCommon.isDefined(this.lastIterationDate);

    if (elapsed <= periodInS) {
      if (isStartup) {
        logger.debug("Iteration check within startup period");
      } else {
        logger.info(
          `Last iteration (${this.lastIterationDate?.toISOString()}) within ${periodInS}s`
        );
      }
      return healthy();
    }

    const msg = isStartup
      ? "Still no iteration registered"
      : `Last iteration (${this.lastIterationDate?.toISOString()}) NOT within ${periodInS}s`;
    return unhealthy([msg]);
  }

  registerIteration() {
    logger.info("Registering iteration");
    this.lastIterationDate = new Date();
  }

  private static secondsBetween(earlier: Date, later: Date): number {
    if (later.getTime() < earlier.getTime()) {
      throw new Error("Check your head.");
    }
    const msDiff = later.getTime() - earlier.getTime();
    return msDiff / 1000;
  }
}
