import { InfluxDB, Point, WritePrecisionType } from "@influxdata/influxdb-client";
import { RedstoneCommon, loggerFactory } from "@redstone-finance/utils";

const logger = loggerFactory("telemetry/TelemetrySendService");

export interface InfluxConstructorAuthParams {
  url: string;
  token: string;
}

export class TelemetryPoint {
  measurementName: string;
  tags: { [key: string]: string } = {};
  fields: {
    string: { [key: string]: string | undefined };
    float: { [key: string]: string | number | undefined };
  } = { string: {}, float: {} };
  time: Date | number | string = Date.now();

  constructor(measurementName: string) {
    this.measurementName = measurementName;
  }

  timestamp(timestamp: Date | number | string): TelemetryPoint {
    this.time = timestamp;
    return this;
  }

  tag(key: string, value: string): TelemetryPoint {
    this.tags[key] = value;
    return this;
  }

  floatField(key: string, value: string | number | undefined): TelemetryPoint {
    this.fields.float[key] = value;
    return this;
  }

  stringField(key: string, value: string | undefined): TelemetryPoint {
    this.fields.string[key] = value;
    return this;
  }
}

type InfluxConnectionInfo = {
  url: string;
  org: string;
  bucket: string;
  precision: string;
};

interface InfluxAuthParams extends InfluxConnectionInfo {
  token: string;
  precision: WritePrecisionType;
}

export interface ITelemetrySendService {
  queueToSendMetric(point: TelemetryPoint): void;

  sendMetricsBatch(): Promise<void>;
}

export class TelemetrySendService implements ITelemetrySendService {
  private influx: InfluxDB;
  private authParams: InfluxAuthParams;
  private metrics: TelemetryPoint[] = [];

  private static parseInfluxUrl(influxUrl: string): InfluxConnectionInfo {
    const parsedUrl = new URL(influxUrl);
    const pathNameWithoutInfluxApi = parsedUrl.pathname.replace("/api/v2/write", "");
    return {
      url: `${parsedUrl.protocol}//${parsedUrl.host}${pathNameWithoutInfluxApi}`,
      org: parsedUrl.searchParams.get("org") || "",
      bucket: parsedUrl.searchParams.get("bucket") || "",
      precision: parsedUrl.searchParams.get("precision") || "ms",
    };
  }

  constructor(constructorAuthParams: InfluxConstructorAuthParams) {
    const connectionInfo = TelemetrySendService.parseInfluxUrl(constructorAuthParams.url);
    this.authParams = {
      ...connectionInfo,
      token: constructorAuthParams.token,
      precision: connectionInfo.precision as WritePrecisionType,
    };

    this.influx = new InfluxDB({
      url: this.authParams.url,
      token: this.authParams.token,
    });

    const originalSend = this.influx.transport.send.bind(this.influx.transport);

    this.influx.transport.send = (path, body, options, callbacks) => {
      if (!options.headers) {
        options.headers = {};
      }
      options.headers["x-api-key"] = this.authParams.token; // add additional header in case we send request to API Gateway proxy
      return originalSend(path, body, options, callbacks);
    };
  }

  private getWriteApi() {
    return this.influx.getWriteApi(
      this.authParams.org,
      this.authParams.bucket,
      this.authParams.precision
    );
  }

  queueToSendMetric(point: TelemetryPoint) {
    this.metrics.push(point);
  }

  async sendMetricsBatch() {
    try {
      if (this.metrics.length === 0) {
        return;
      }
      logger.info(`Sending batch with ${this.metrics.length} metrics`);

      const writeApi = this.getWriteApi();
      writeApi.writePoints(this.metrics.map(telemetryPointToInfluxPoint));
      this.metrics = [];

      await writeApi.close();
      logger.info(`Metrics sent`);
    } catch (error) {
      logger.error(`Failed saving metric: ${RedstoneCommon.stringifyError(error)}`);
    }
  }

  async sendAggregatedMetricsBatch() {
    try {
      if (this.metrics.length === 0) {
        return;
      }
      logger.info(`Sending aggregated batch with ${this.metrics.length} metrics`);
      const aggregatedPoints = telemetryPointsToAggregatedInfluxPoints(this.metrics);

      const writeApi = this.getWriteApi();
      writeApi.writePoints(aggregatedPoints);
      this.metrics = [];
      await writeApi.close();
      logger.info(`Aggregated metrics sent`);
    } catch (error) {
      logger.error(`Failed sending aggregated metrics: ${RedstoneCommon.stringifyError(error)}`);
    }
  }
}

class MockTelemetrySendService implements ITelemetrySendService {
  queueToSendMetric(_point: TelemetryPoint) {}

  async sendMetricsBatch() {}

  async sendAggregatedMetricsBatch() {}
}

let telemetrySendServiceInstance: TelemetrySendService | MockTelemetrySendService | undefined;

export function getTelemetrySendService(
  telemetryUrl: string | undefined,
  telemetryAuthorizationToken: string | undefined
): TelemetrySendService | MockTelemetrySendService {
  if (!telemetrySendServiceInstance) {
    if (!telemetryUrl || !telemetryAuthorizationToken) {
      telemetrySendServiceInstance = new MockTelemetrySendService();
    } else {
      telemetrySendServiceInstance = new TelemetrySendService({
        url: telemetryUrl,
        token: telemetryAuthorizationToken,
      });
    }
  }
  return telemetrySendServiceInstance;
}

export function telemetryPointToInfluxPoint(point: TelemetryPoint): Point {
  const influxPoint = new Point(point.measurementName);
  influxPoint.timestamp(point.time);
  for (const [key, value] of Object.entries(point.tags)) {
    influxPoint.tag(key, value);
  }
  for (const [key, value] of Object.entries(point.fields.float)) {
    influxPoint.floatField(key, value);
  }
  for (const [key, value] of Object.entries(point.fields.string)) {
    influxPoint.stringField(key, value);
  }

  return influxPoint;
}

// Groups telemetry points by measurement + tags + string fields
function groupTelemetryPoints(points: TelemetryPoint[]): Map<string, TelemetryPoint[]> {
  const grouped = new Map<string, TelemetryPoint[]>();
  for (const telemetryPoint of points) {
    const tagKey = [
      telemetryPoint.measurementName,
      ...Object.entries(telemetryPoint.tags)
        .sort()
        .map(([k, v]) => `${k}=${v}`),
      ...Object.entries(telemetryPoint.fields.string)
        .sort()
        .map(([k, v]) => `${k}=${v}`),
    ].join("|");
    if (!grouped.has(tagKey)) {
      grouped.set(tagKey, []);
    }
    grouped.get(tagKey)!.push(telemetryPoint);
  }
  return grouped;
}

export function telemetryPointsToAggregatedInfluxPoints(points: TelemetryPoint[]): Point[] {
  const groupedPoints = groupTelemetryPoints(points);

  const aggregatedPoints: Point[] = [];

  for (const pointGroup of groupedPoints.values()) {
    const { measurementName, tags, fields } = pointGroup[0];

    // We create a single point from points with the same measurement + tags + string fields
    // Measuremnt, tags and string fields remain the same
    const influxPoint = new Point(measurementName);
    Object.entries(tags).forEach(([k, v]) => influxPoint.tag(k, v));
    Object.entries(fields.string).forEach(([k, v]) => influxPoint.stringField(k, v));

    const uniqueFloatFields = new Set<string>();
    pointGroup.forEach((telemetryPoint) => {
      Object.keys(telemetryPoint.fields.float).forEach((floatField) =>
        uniqueFloatFields.add(floatField)
      );
    });

    // For each floatField with the same name we take min, max and average from all the values
    uniqueFloatFields.forEach((floatFieldName) => {
      // We filter out undefined values
      const values = pointGroup
        .map((telemetryPoint) => telemetryPoint.fields.float[floatFieldName])
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) {
        return;
      }

      influxPoint.floatField(`${floatFieldName}-min`, Math.min(...values));
      influxPoint.floatField(`${floatFieldName}-max`, Math.max(...values));
      const sum = values.reduce((a, b) => a + b, 0);
      influxPoint.floatField(`${floatFieldName}-avg`, sum / values.length);
    });

    const latestTimestamp = Math.max(...pointGroup.map((m) => new Date(m.time).getTime()));
    influxPoint.timestamp(latestTimestamp);
    aggregatedPoints.push(influxPoint);
  }

  return aggregatedPoints;
}
