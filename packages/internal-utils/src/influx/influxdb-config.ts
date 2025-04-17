import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { getSSMParameterValue } from "../aws/params";
import { InfluxAuthParams } from "./InfluxService";

export const INFLUXDB_ORG = "redstone";
export const INFLUXDB_BUCKET = "redstone";

export interface InfluxConfig {
  url: string;
  token: string;
}

const INFLUX_PARAMS_AWS_REGION = "eu-west-1";

export function toInfluxAuthParams(config: InfluxConfig): InfluxAuthParams {
  return {
    url: config.url,
    token: config.token,
    bucketName: INFLUXDB_BUCKET,
    orgName: INFLUXDB_ORG,
  };
}

export async function fetchAnalyticsInfluxConfig(): Promise<InfluxConfig> {
  const influxDbUrlPromise = getSSMParameterValue(
    process.env.INFLUXDB_URL_SSM_PATH ?? "/dev/influxdb/url",
    INFLUX_PARAMS_AWS_REGION
  );
  const influxDbTokenPromise = getSSMParameterValue(
    process.env.INFLUXDB_TOKEN_SSM_PATH ?? "/dev/influxdb/token",
    INFLUX_PARAMS_AWS_REGION
  );

  return {
    url: (await influxDbUrlPromise)!,
    token: (await influxDbTokenPromise)!,
  };
}

export async function fetchManagedInfluxConfig(): Promise<InfluxConfig> {
  const influxDbUrlPromise = getSSMParameterValue(
    process.env.MANAGED_INFLUXDB_URL_SSM_PATH ?? "/dev/influxdb/managed-url",
    INFLUX_PARAMS_AWS_REGION
  );
  const influxDbTokenPromise = getSSMParameterValue(
    process.env.MANAGED_INFLUXDB_TOKEN_SSM_PATH ??
      "/dev/influxdb/managed-token",
    INFLUX_PARAMS_AWS_REGION
  );

  return {
    url: (await influxDbUrlPromise)!,
    token: (await influxDbTokenPromise)!,
  };
}

/**
 * @deprecated This method is deprecated.
 * Please define an InfluxService-class instance and use "insert" method.
 */
export async function insertIntoInfluxDb(
  influx: InfluxDB,
  requestData: Point[]
) {
  const writeApi = influx.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, "ms");
  requestData.forEach((data) => writeApi.writePoint(data));
  await writeApi.close();
}
