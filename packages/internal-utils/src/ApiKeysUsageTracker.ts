import { Point } from "@influxdata/influxdb-client";
import { RedstoneCommon, loggerFactory } from "@redstone-finance/utils";
import { createHash } from "crypto";
import { InfluxService } from "./influx/InfluxService";

const logger = loggerFactory("ApiKeysUsageTracker");

interface RequestMetrics {
  [hashedKey: string]: number;
}

export interface ApiKeysUsageTrackerConfig {
  influxUrl?: string;
  influxToken?: string;
  serviceName: string;
  reportingIntervalMs?: number;
}

export class ApiKeysUsageTracker {
  private requestMetrics: RequestMetrics = {};
  private influxService?: InfluxService;
  private readonly config: ApiKeysUsageTrackerConfig;
  private reportingInterval!: NodeJS.Timeout;

  constructor(config: ApiKeysUsageTrackerConfig) {
    this.config = {
      reportingIntervalMs: 60000, // Default 60 seconds
      ...config,
    };
    this.initializeTelemetryService();
    this.startPeriodicReporting();
  }

  private initializeTelemetryService() {
    if (!this.config.influxUrl || !this.config.influxToken) {
      logger.info(
        "InfluxDB configuration not provided, metrics will not be sent"
      );
      return;
    }

    try {
      // Extract base URL and parse bucket/org from the full write endpoint URL
      const url = new URL(this.config.influxUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      const bucket =
        url.searchParams.get("bucket") || `${this.config.serviceName}-metrics`;
      const org = url.searchParams.get("org") || "redstone";

      this.influxService = new InfluxService({
        url: baseUrl,
        token: this.config.influxToken,
        bucketName: bucket,
        orgName: org,
      });

      logger.info(
        `InfluxService initialized successfully - URL: ${baseUrl}, Bucket: ${bucket}, Org: ${org}, Service: ${this.config.serviceName}`
      );
    } catch (error) {
      logger.error(
        `Failed to initialize InfluxService: ${RedstoneCommon.stringifyError(error)}`
      );
    }
  }

  trackBulkRequest(apiKey: string) {
    if (!apiKey) {
      logger.warn("Attempted to track request without API key");
      return;
    }

    const hashedKey = ApiKeysUsageTracker.hashApiKey(apiKey);
    this.requestMetrics[hashedKey] ??= 0;
    this.requestMetrics[hashedKey] += 1;

    logger.debug(
      `Tracked request for key hash: ${hashedKey}, count: ${this.requestMetrics[hashedKey]}, service: ${this.config.serviceName}`
    );
  }

  private static hashApiKey(apiKey: string): string {
    return createHash("sha256").update(apiKey).digest("hex");
  }

  private startPeriodicReporting() {
    this.reportingInterval = setInterval(() => {
      void this.reportAndResetMetrics();
    }, this.config.reportingIntervalMs);

    logger.info(
      `Started periodic metrics reporting (every ${this.config.reportingIntervalMs!}ms) for service: ${this.config.serviceName}`
    );
  }

  private async reportAndResetMetrics() {
    if (!this.influxService || Object.keys(this.requestMetrics).length === 0) {
      logger.debug("No metrics to report");
      return;
    }

    try {
      const timestamp = Date.now();

      // Create points for all current metrics
      const dataPoints = Object.entries(this.requestMetrics).map(
        ([hashedKey, count]) => {
          const point = new Point("apiRequestsPerMinute")
            .tag("service", this.config.serviceName)
            .tag("keyHash", hashedKey)
            .intField("requestCount", count)
            .timestamp(timestamp);

          logger.debug(
            `Creating point for key hash: ${hashedKey}, count: ${count}, service: ${this.config.serviceName}`
          );
          return point;
        }
      );

      // Send all points at once
      await this.influxService.insert(dataPoints);

      logger.debug(
        `Successfully reported ${dataPoints.length} metrics to InfluxDB for ${Object.keys(this.requestMetrics).length} API keys (service: ${this.config.serviceName})`
      );

      // Reset metrics for next reporting period
      this.requestMetrics = {};
    } catch (error) {
      logger.error(
        `Failed to report metrics to InfluxDB: ${RedstoneCommon.stringifyError(error)}`
      );
      // Don't reset metrics on failure, try again next reporting period
    }
  }

  async shutdown() {
    clearInterval(this.reportingInterval);
    logger.info(
      `Stopped periodic metrics reporting for service: ${this.config.serviceName}`
    );

    if (this.influxService) {
      try {
        // Report any remaining metrics before shutdown
        await this.reportAndResetMetrics();
        logger.info(
          `Metrics tracker shutdown completed successfully for service: ${this.config.serviceName}`
        );
      } catch (error) {
        logger.error(
          `Error during metrics tracker shutdown: ${RedstoneCommon.stringifyError(error)}`
        );
      }
    }
  }

  getCurrentMetrics(): RequestMetrics {
    return { ...this.requestMetrics };
  }
}
