import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import {
  type HealthCheck,
  type HealthCheckResult,
  healthy,
  unhealthy,
} from "./common";

const logger = loggerFactory("IterationHealthCheck");

/**
 * Health check implementation that monitors how many iteration events
 * have occurred within a defined period to determine system health.
 *
 * This health check is useful for ensuring that a background process
 * or loop is running with expected frequency and consistency.
 *
 * Environment variables used (must be set):
 * - `HEALTHCHECK_ITERATION_PERIOD_S`: Period (in seconds) during which iterations are counted.
 * - `HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS`: Minimum number of iterations required within the period.
 * - `HEALTHCHECK_ITERATION_START_PERIOD_S`: (Optional) Startup grace period (in seconds); defaults to 30s.
 */
export class IterationsHealthCheck implements HealthCheck {
  // latest iteration times at the beginning
  private readonly iterationsDescTimes: number[] = [];
  private readonly params = Object.freeze({
    periodInS: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_ITERATION_PERIOD_S",
      z.number() // no sane default
    ),
    minRequiredIterations: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS",
      z.number() // no sane default
    ),
    startPeriodInS: RedstoneCommon.getFromEnv(
      "HEALTHCHECK_ITERATION_START_PERIOD_S",
      z.number().default(30)
    ),
  });

  private readonly startDate = new Date();

  check(fireDate: Date): Promise<HealthCheckResult> {
    if (
      IterationsHealthCheck.secondsBetween(this.startDate, fireDate) <=
      this.params.startPeriodInS
    ) {
      logger.debug("Iteration check within startup period");
      return healthy();
    }

    const checkPeriodStartMs =
      fireDate.getTime() - this.params.periodInS * 1000;
    const pruned = this.pruneOlderThan(checkPeriodStartMs);
    logger.debug(`Pruned ${pruned} oldest iteration entries`);
    const iterationsWithinPeriod = this.iterationsDescTimes.length;

    const msg = `${iterationsWithinPeriod} iterations registered within last ${this.params.periodInS}s, required: ${this.params.minRequiredIterations}`;
    if (iterationsWithinPeriod >= this.params.minRequiredIterations) {
      logger.info(msg);
      return healthy();
    } else {
      return unhealthy([msg]);
    }
  }

  registerIteration() {
    logger.info("Registering iteration");
    this.iterationsDescTimes.unshift(Date.now());
  }

  private pruneOlderThan(oldestAllowedIterationTime: number): number {
    let removed = 0;
    while (this.iterationsDescTimes.length > 0) {
      const currentOldestTime = this.iterationsDescTimes.at(-1)!;
      if (currentOldestTime < oldestAllowedIterationTime) {
        this.iterationsDescTimes.pop();
        removed++;
      } else {
        break;
      }
    }
    return removed;
  }

  private static secondsBetween(earlier: Date, later: Date): number {
    if (later.getTime() < earlier.getTime()) {
      throw new Error("Check your head.");
    }
    const msDiff = later.getTime() - earlier.getTime();
    return msDiff / 1000;
  }
}
