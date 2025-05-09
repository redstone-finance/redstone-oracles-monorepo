import {
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
  region?: string
) {
  const params = {
    MetricData: values.map(({ value, dimensions }) => {
      return {
        MetricName: metricName,
        Dimensions: dimensions,
        Unit: unit,
        Value: value,
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

  return Object.fromEntries(
    Tags.filter(isTagDefined).map((tag) => [tag.Key!, tag.Value!])
  );
}

function isTagDefined(tag: Tag) {
  return tag.Key !== undefined && tag.Value !== undefined;
}

export const sendHealthcheckMetric = async (healthcheckMetricName?: string) => {
  const METRICS_NAMESPACE = "Health-Check-Metrics";
  if (!healthcheckMetricName) {
    return;
  }
  const start = Date.now();
  await sendMetrics(METRICS_NAMESPACE, healthcheckMetricName, [{ value: 1 }]);
  console.info(`Sent healthcheck metric in ${Date.now() - start}ms`);
};
