import {
  GetMetricDataCommand,
  ListTagsForResourceCommand,
  PutMetricDataCommand,
  StandardUnit,
  StateValue,
  Tag,
} from "@aws-sdk/client-cloudwatch";
import { getCloudwatch, getCloudWatchClient } from "./aws-clients";

export async function sendMetrics(
  namespace: string,
  metricName: string,
  values: {
    value: number;
    dimensions?: {
      Name: string;
      Value: string;
    }[];
  }[] = [],
  unit = StandardUnit.Count,
  region?: string,
  storageResolution = 60
) {
  const params = {
    MetricData: values.map(({ value, dimensions }) => {
      return {
        MetricName: metricName,
        Dimensions: dimensions,
        Unit: unit,
        Value: value,
        StorageResolution: storageResolution,
      };
    }),
    Namespace: namespace,
  };

  const command = new PutMetricDataCommand(params);

  try {
    await getCloudWatchClient(region).send(command);
  } catch (error) {
    console.error("Error sending metric data:", error);
  }
}

export async function setAlarmState(
  alarmName: string,
  state: StateValue = StateValue.INSUFFICIENT_DATA,
  region?: string
) {
  return await getCloudwatch(region).setAlarmState({
    AlarmName: alarmName,
    StateValue: state,
    StateReason: `Alarm state set to ${state} by lambda function`,
  });
}

export async function getAlarmTags(
  alarmArn: string,
  region?: string
): Promise<Record<string, string>> {
  const { Tags } = await getCloudWatchClient(region).send(
    new ListTagsForResourceCommand({
      ResourceARN: alarmArn,
    })
  );

  if (!Tags) {
    return {};
  }

  return Object.fromEntries(Tags.filter(isTagDefined).map((tag) => [tag.Key!, tag.Value!]));
}

function isTagDefined(tag: Tag) {
  return tag.Key !== undefined && tag.Value !== undefined;
}

export const sendHealthcheckMetric = async (
  healthcheckMetricName?: string,
  logPerf = true,
  storageResolution?: number
) => {
  const METRICS_NAMESPACE = "Health-Check-Metrics";
  if (!healthcheckMetricName) {
    return;
  }
  const start = Date.now();
  await sendMetrics(
    METRICS_NAMESPACE,
    healthcheckMetricName,
    [{ value: 1 }],
    undefined,
    undefined,
    storageResolution
  );
  if (logPerf) {
    console.info(
      `Sent healthcheck metric in ${Date.now() - start}ms (metric name: ${healthcheckMetricName})`
    );
  }
};

export const getHealthcheckMetric = async (
  healthcheckMetricName: string,
  period: number,
  region?: string
) => {
  const id = "m1";
  const params = {
    MetricDataQueries: [
      {
        Id: id,
        MetricStat: {
          Metric: {
            Namespace: "Health-Check-Metrics",
            MetricName: healthcheckMetricName,
          },
          Period: 1,
          Stat: "Minimum",
        },
        ReturnData: true,
      },
    ],
    StartTime: new Date(Date.now() - period),
    EndTime: new Date(),
  };

  const command = new GetMetricDataCommand(params);

  const response = await getCloudWatchClient(region).send(command);

  return response.MetricDataResults?.find((m) => m.Id === id);
};
