import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { scheduleJob } from "node-schedule";
import { promises as fs } from "node:fs";
import {
  HealthStatus,
  type HealthCheck,
  type HealthCheckResult,
  type HealthCheckResults,
} from "./common";

const logger = loggerFactory("HealthMonitor");

/**
 * Schedules and runs a set of health checks at a fixed interval, aggregates their results,
 * and writes the combined status to a state file atomically.
 *
 * @param checks
 *   A Map of health checks to perform on each run
 * @param intervalMs
 *   The polling interval in milliseconds. Internally converted to a cron
 *   expression for use with `node-schedule`.
 *
 * On each scheduled firing:
 *    - Invokes all registered health checks in parallel (with a timeout).
 *    - Collects individual statuses and errors into a results map.
 *    - Determines overall status: healthy only if every check is healthy.
 *    - Writes the status to disk atomically.
 */
export class HealthMonitor {
  // note: this needs to be hardcoded, as it is the value assumed by the Dockerfile.
  private readonly healthcheckFile = "healthcheck.txt";

  constructor(
    private readonly checks = new Map<string, HealthCheck>(),
    intervalMs: number
  ) {
    const cronExpr = RedstoneCommon.intervalMsToCronFormat(intervalMs);
    scheduleJob(cronExpr, this.runChecks.bind(this));
  }

  private async runChecks(fireDate: Date): Promise<void> {
    try {
      logger.debug(`Running health checks`);
      const data = await this.collectHealthData(fireDate);
      if (data.status !== HealthStatus.healthy) {
        logger.warn(
          `Health check status: ${data.status}, errors: ${JSON.stringify(data.results)}`
        );
      }
      await this.atomicWriteStateFile(data.status);
    } catch (e) {
      logger.error(
        `Error while running health checks: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  private async collectHealthData(fireDate: Date): Promise<HealthCheckResults> {
    const checkPromises = this.prepareCheckPromises(fireDate);
    const rawResults = await Promise.all(checkPromises);

    const results = Object.fromEntries(
      rawResults.map(({ key, status, errors }) => [key, { status, errors }])
    );

    const anyFailed = Object.values(results).some(
      (r) => r.status !== HealthStatus.healthy
    );
    const overallStatus = anyFailed
      ? HealthStatus.unhealthy
      : HealthStatus.healthy;

    return {
      status: overallStatus,
      results,
    };
  }

  private prepareCheckPromises(fireDate: Date) {
    return Array.from(this.checks.entries()).map(async ([key, healthCheck]) => {
      try {
        const { status, errors } =
          await RedstoneCommon.timeout<HealthCheckResult>(
            healthCheck.check(fireDate),
            3000
          );
        return { key, status, errors };
      } catch (err) {
        // If it throws (e.g. timeout), treat as unhealthy
        return {
          key,
          status: HealthStatus.unhealthy,
          errors: [RedstoneCommon.stringifyError(err)],
        };
      }
    });
  }

  private async atomicWriteStateFile(newStatus: HealthStatus): Promise<void> {
    const tmpPath = `${this.healthcheckFile}.tmp`;

    // Write to a .tmp file first...
    await fs.writeFile(tmpPath, newStatus, { encoding: "utf8" });
    // ...then atomically rename into place
    await fs.rename(tmpPath, this.healthcheckFile);
  }
}
