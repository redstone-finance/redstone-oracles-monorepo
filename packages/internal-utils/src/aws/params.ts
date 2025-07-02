import {
  GetParameterCommand,
  GetParametersCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { getSsmClient } from "./aws-clients";
import { readS3Object } from "./s3";
import {
  getFromSsmCache,
  getManyFromSsmCache,
  saveManyToSsmCache,
  saveToSsmCache,
} from "./ssm-cache";

// limit enforced by ssm
const MAX_SSM_BATCH_SIZE = 10;

const getParameterValue = async (parameterName: string, region?: string) => {
  const client = getSsmClient(region);
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  });

  return (await client.send(command)).Parameter?.Value;
};

export const getSSMParameterValue = async (
  parameterName: string,
  region?: string
) => {
  const cachedValue = getFromSsmCache(parameterName);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const value = await getParameterValue(parameterName, region);
  saveToSsmCache(parameterName, value);

  return value;
};

export type SSMParameterValuesResponse = Record<string, string | undefined>;

export const getSSMParameterValues = async (
  parameterNames: string[],
  region?: string
): Promise<SSMParameterValuesResponse> => {
  const client = getSsmClient(region);

  const cachedParameters = getManyFromSsmCache(parameterNames);
  const parametersToFetch = parameterNames.filter(
    (name) => !(name in cachedParameters)
  );

  const parameterNamesChunks = _.chunk(parametersToFetch, MAX_SSM_BATCH_SIZE);

  let collectedParameters: SSMParameterValuesResponse = {};

  // let's avoid rate limits by not using Promise.all
  for (const parameterNameChunk of parameterNamesChunks) {
    const paramsForChunk = await getSSMParameterValuesBatch(
      client,
      parameterNameChunk
    );

    collectedParameters = { ...collectedParameters, ...paramsForChunk };
  }

  saveManyToSsmCache(collectedParameters);
  return { ...collectedParameters, ...cachedParameters };
};

const getSSMParameterValuesBatch = async (
  ssmClient: SSMClient,
  parameterNames: string[]
): Promise<SSMParameterValuesResponse> => {
  const command = new GetParametersCommand({
    Names: parameterNames,
    WithDecryption: true,
  });
  const response = await ssmClient.send(command);

  if (!RedstoneCommon.isDefined(response.Parameters)) {
    return {};
  }

  const collectedParameters: SSMParameterValuesResponse = {};

  for (const ssmParameter of response.Parameters) {
    if (RedstoneCommon.isDefined(ssmParameter.Value)) {
      if (ssmParameter.ARN && parameterNames.includes(ssmParameter.ARN)) {
        collectedParameters[ssmParameter.ARN] = ssmParameter.Value;
      } else {
        collectedParameters[ssmParameter.Name!] = ssmParameter.Value;
      }
    }
  }

  return collectedParameters;
};

export const getS3ConfigurationValue = async <T>() => {
  const bucketName = process.env.CONFIGURATION_S3_BUCKET;
  const objectKey = process.env.CONFIGURATION_S3_OBJECT;
  if (!bucketName || !objectKey) {
    throw new Error("S3 configuration not set");
  }
  return await readS3Object<T>(bucketName, objectKey);
};

// Get ENV variables that end with "_ARN"
// Try to get the value from SSM and set it in the ENV, but rename the key to remove "_ARN"
export const secretsToEnv = async (): Promise<void> => {
  const promises = Object.entries(process.env)
    .filter(([key]) => key.endsWith("_ARN"))
    .map(async ([key, value]) => {
      const envVariable = key.replace("_ARN", "");
      if (envVariable === "" || !value || value === "") {
        return;
      }

      const secret = await getSSMParameterValue(value);
      if (secret) {
        process.env[envVariable] = secret;
      }
    });

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error("Error while fetching secrets", error);
  }
};

export const getSSMParamWithEnvFallback = async (
  parameterName: string | undefined,
  envVarName: string,
  region?: string
) => {
  if (parameterName) {
    const value = await getSSMParameterValue(parameterName, region);
    if (value !== undefined) {
      return value;
    }
  }

  return RedstoneCommon.getFromEnv(envVarName);
};
