import { CloudWatch, CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ECSClient } from "@aws-sdk/client-ecs";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3 } from "@aws-sdk/client-s3";
import { SSMClient } from "@aws-sdk/client-ssm";
import { regionalCache } from "./region";

export const getCloudwatch = regionalCache(
  (region: string) => new CloudWatch({ region })
);

export const getCloudWatchClient = regionalCache(
  (region: string) => new CloudWatchClient({ region })
);

export const getEcsClient = regionalCache(
  (region: string) => new ECSClient({ region })
);

export const getLambdaClient = regionalCache(
  (region: string) => new LambdaClient({ region })
);

export const getS3 = regionalCache((region: string) => new S3({ region }));

export const getSsmClient = regionalCache(
  (region: string) => new SSMClient({ region })
);

export const getDynamoDbClient = regionalCache(
  (region: string) => new DynamoDBClient({ region })
);
