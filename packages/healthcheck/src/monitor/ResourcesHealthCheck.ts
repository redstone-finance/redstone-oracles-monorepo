import { loggerFactory } from "@redstone-finance/utils";
import * as os from "node:os";
import * as v8 from "node:v8";
import {
  type HealthCheck,
  type HealthCheckResult,
  healthy,
  unhealthy,
} from "./common";

export interface ResourceThresholds {
  memoryPercent: number;
  gracePeriodMs: number;
}

const logger = loggerFactory("ResourcesHealthCheck");

/**
 * Monitors process memory usage against configured threshold,
 * with a grace period before reporting an unhealthy status.
 *
 * On each invocation of `check`:
 * 1. Verifies the os memory usage
 * 2. Compares usage to the provided `thresholds.memoryPercent`.
 * 3. If usage is under threshold:
 *    - Resets any previously tracked exceed timer.
 *    - Returns a healthy result immediately.
 * 4. If usage exceeds either threshold:
 *    - On first exceed, records the timestamp (`thresholdExceededSince`) but still returns healthy.
 *    - On subsequent checks, calculates how long usage has remained over the limit.
 *      - If that duration > `thresholds.gracePeriodMs`, returns unhealthy with an explanatory error.
 *      - Otherwise, still returns healthy until the grace period elapses.
 */
export class ResourcesHealthCheck implements HealthCheck {
  private thresholdExceededSince: number | null = null;

  constructor(private readonly thresholds: ResourceThresholds) {}

  check(fireDate: Date): Promise<HealthCheckResult> {
    const memUsage = this.calculateMemUsagePercentage();
    const now = fireDate.getTime();
    const exceeded = memUsage > this.thresholds.memoryPercent;

    // If we’re back under thresholds, reset and report healthy immediately.
    if (!exceeded) {
      this.thresholdExceededSince = null;
      return healthy();
    }

    // First time crossing the threshold: start the timer but still report healthy.
    if (this.thresholdExceededSince == null) {
      this.thresholdExceededSince = now;
      return healthy();
    }

    // Otherwise, check how long we’ve been over the limit.
    const elapsed = now - this.thresholdExceededSince;
    if (elapsed > this.thresholds.gracePeriodMs) {
      return unhealthy([
        `Mem usage exceeded for ${elapsed} ms. Current ${memUsage}%`,
      ]);
    }

    // Still within the grace period.
    return healthy();
  }

  private calculateMemUsagePercentage(): number {
    const memUsage: NodeJS.MemoryUsage = process.memoryUsage();
    logger.debug("Process memory usage", {
      rss: `${formatMemoryUsage(memUsage.rss)}`,
      heapTotal: `${formatMemoryUsage(memUsage.heapTotal)}`,
      heapUsed: `${formatMemoryUsage(memUsage.heapUsed)}`,
      external: `${formatMemoryUsage(memUsage.external)}`,
    });
    const osFreemem = os.freemem();
    const osTotalmem = os.totalmem();
    const usedMem = osTotalmem - osFreemem;
    logger.debug("OS memory usage", {
      free: formatMemoryUsage(osFreemem),
      total: formatMemoryUsage(osTotalmem),
      used: formatMemoryUsage(usedMem),
    });
    const { used_heap_size, heap_size_limit } = v8.getHeapStatistics();
    logger.debug("V8 heap stats", {
      usedHeapSize: formatMemoryUsage(used_heap_size),
      heapSizeLimit: formatMemoryUsage(heap_size_limit),
    });

    return (used_heap_size / heap_size_limit) * 100;
  }
}

const formatMemoryUsage = (data: number) =>
  `${Math.round((data / (1024 * 1024)) * 100) / 100} MB`;
