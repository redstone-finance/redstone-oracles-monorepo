import { S3 } from "@aws-sdk/client-s3";
import {
  GetParameterCommand,
  GetParametersCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ZodType, ZodTypeDef } from "zod";
import { AWS_REGION } from "./aws";
import { getNonExpiredDataFromSSMCache, saveDataInSSMCache } from "./ssm-cache";

const s3 = new S3();
const ssmClient = new SSMClient({ region: AWS_REGION });

const getClient = (region?: string) =>
  region ? new SSMClient({ region }) : ssmClient;

export async function getSSMParameterValue(
  parameterName: string,
  region?: string
) {
  const currentTime = Date.now();
  const cachedData = getNonExpiredDataFromSSMCache(
    { parameterName, region },
    currentTime
  );

  if (cachedData) {
    console.log(`Using cached SSM value for ${parameterName}`);
    return cachedData.value;
  }

  const client = getClient(region);
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  });

  const parameterValue = (await client.send(command)).Parameter?.Value;
  saveDataInSSMCache({ parameterName, region }, parameterValue, currentTime);

  return parameterValue;
}

export async function getSSMParametersValues(
  parameterNames: string[],
  region?: string
) {
  const currentTime = Date.now();
  const result: Record<string, string | undefined> = {};

  const parametersToFetch = [];
  for (const parameterName of parameterNames) {
    const cachedData = getNonExpiredDataFromSSMCache(
      { parameterName, region },
      currentTime
    );

    if (cachedData) {
      console.log(`Using cached SSM value for ${parameterName}`);
      result[parameterName] = cachedData.value;
    } else {
      parametersToFetch.push(parameterName);
    }
  }

  if (parametersToFetch.length === 0) {
    // All data was cached, nothing to fetch
    return result;
  }

  const client = getClient(region);
  const command = new GetParametersCommand({
    Names: parametersToFetch,
    WithDecryption: true,
  });

  const parameters = (await client.send(command)).Parameters;
  if (parameters === undefined) {
    console.warn(
      "Failed to fetch parameters from SSM, returning only cached ones"
    );
    console.warn("Failed parameters:", parametersToFetch);
    return result;
  }

  for (const parameter of parameters) {
    if (parameter.Name) {
      result[parameter.Name] = parameter.Value;
      saveDataInSSMCache(
        { parameterName: parameter.Name, region },
        parameter.Value,
        currentTime
      );
    }
  }

  return result;
}

export async function getSSMParamWithEnvFallback<T = string>(
  parameterName: string | undefined,
  envVariable: string,
  schema?: ZodType<T, ZodTypeDef, T | undefined>,
  region?: string
) {
  if (!parameterName) {
    console.log(
      `SSM Path was not provided, defaulting to value from ENV ${envVariable}`
    );
    return RedstoneCommon.getFromEnv(envVariable, schema);
  }

  try {
    const parameter = await getSSMParameterValue(parameterName, region);
    if (parameter) {
      return parameter;
    }

    console.warn(`Failed to fetch value of ${parameterName} from SSM`);
  } catch (e) {
    console.warn(
      `An error occured when fetching SSM Parameter Value from ${parameterName}`
    );
    RedstoneCommon.stringifyError(e);
  }

  console.warn(`Defaulting to value from ENV ${envVariable}`);
  return RedstoneCommon.getFromEnv(envVariable, schema);
}

export async function getRequiredSSMParametersValues(
  parameterNames: string[],
  region?: string
): Promise<Record<string, string>> {
  const parameters = await getSSMParametersValues(parameterNames, region);

  RedstoneCommon.assert(
    parameters,
    `Failed to retrieve parameters data from GetParameters command`
  );

  const result: Record<string, string> = {};

  for (const [parameterName, value] of Object.entries(parameters)) {
    RedstoneCommon.assert(
      value,
      `Failed to fetch value of ${parameterName} from SSM`
    );
    result[parameterName] = value;
  }

  return result;
}

export async function getS3ParameterValue(
  bucketName: string,
  objectKey: string
) {
  const params = {
    Bucket: bucketName,
    Key: objectKey,
  };

  const data = await s3.getObject(params);

  return await data.Body?.transformToString("utf-8");
}

export async function getS3ConfigurationValue() {
  const bucketName = process.env.CONFIGURATION_S3_BUCKET;
  const objectKey = process.env.CONFIGURATION_S3_OBJECT;

  if (!bucketName || !objectKey) {
    throw new Error("S3 configuration not set");
  }

  return await getS3ParameterValue(bucketName, objectKey);
}

// Get ENV variables that end with "_ARN"
// Try to get the value from SSM and set it in the ENV, but rename the key to remove "_ARN"
export const secretsToEnv = async (): Promise<void> => {
  const promises = Object.entries(process.env)
    .filter(([key]) => key.endsWith("_ARN"))
    .map(async ([key, value]) => {
      const envVariable = key.replace("_ARN", "");
      if (envVariable === "" || !value || value === "") {
        return await Promise.resolve();
      }

      const secret = await getSSMParameterValue(value);
      if (secret) {
        process.env[envVariable] = secret;
      }
    });

  if (promises.length === 0) {
    return await Promise.resolve();
  }

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error("Error while fetching secrets", error);
  }
};
