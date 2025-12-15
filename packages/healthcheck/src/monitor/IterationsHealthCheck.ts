import { loggerFactory } from "@redstone-finance/utils";
import { type HealthCheck, type HealthCheckResult, healthy, unhealthy } from "./common";

const logger = loggerFactory("IterationHealthCheck");

/**
 * Health check implementation that monitors when the last iteration
 * has occurred.
 *
 * This health check is useful for ensuring that a background process
 * or loop is running with expected frequency and consistency.
 *
 * Options
 * - `periodInS`: Period (in seconds) during which iteration should occur.
 * - `startPeriodInS`: Service startup period (in seconds) during which no iteration needs to be registered
 * (i.e. when the service is starting and performs additional initialization which delays the first iteration registration)
 */
export class IterationsHealthCheck implements HealthCheck {
  private readonly startDate = new Date();
  private lastIterationDate: Date | null = null;

  constructor(
    private readonly params: {
      periodInS: number;
      startPeriodInS: number;
    }
  ) {}

  check(fireDate: Date): Promise<HealthCheckResult> {
    const { periodInS } = this.params;
    const isWithinStartupPeriod =
      IterationsHealthCheck.secondsBetween(this.startDate, fireDate) <= this.params.startPeriodInS;
    if (isWithinStartupPeriod) {
      logger.info("Still within startup period");
      return healthy();
    }

    const referenceDate = this.lastIterationDate ?? this.startDate;
    if (fireDate.getTime() < referenceDate.getTime()) {
      logger.warn("Possible overlapping iterations", { referenceDate, fireDate });
      // note: yes, we consider "overlapping" iterations as "healthy"
      return healthy();
    }
    const elapsed = IterationsHealthCheck.secondsBetween(referenceDate, fireDate);

    if (elapsed <= periodInS) {
      logger.info(`Last iteration (${this.lastIterationDate?.toISOString()}) within ${periodInS}s`);
      return healthy();
    }

    const msg = `Last iteration (${this.lastIterationDate?.toISOString() ?? "none registered"}) NOT within ${periodInS}s`;
    return unhealthy([msg]);
  }

  registerIteration() {
    logger.info("Registering iteration");
    this.lastIterationDate = new Date();
  }

  private static secondsBetween(earlier: Date, later: Date): number {
    const msDiff = later.getTime() - earlier.getTime();
    return msDiff / 1000;
  }
}
