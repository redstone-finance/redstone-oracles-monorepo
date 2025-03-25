import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { AWS_REGION } from "./aws";
import { readS3Object } from "./s3";

const ssmClient = new SSMClient({ region: AWS_REGION });

export const getSSMParameterValue = async (
  parameterName: string,
  region?: string
) => {
  const client = region ? new SSMClient({ region }) : ssmClient;
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  });

  return (await client.send(command)).Parameter?.Value;
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
