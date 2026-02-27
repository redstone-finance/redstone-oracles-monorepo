import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { readS3Object } from "./aws/s3";

const LARGE_ENV_KEYS_ENV_VAR = "LARGE_ENV_BUCKET_KEYS";
const LARGE_ENV_BUCKET_NAME_ENV_VAR = "LARGE_ENV_BUCKET_NAME";
const LARGE_ENV_REGION_ENV_VAR = "LARGE_ENV_REGION";

type GetLargeEnvType = {
  <T extends z.ZodType>(key: string, schema: T): Promise<z.infer<typeof schema>>;
  (key: string): Promise<string>;
  <T>(key: string, schema?: z.ZodType<T>): Promise<T>;
};

export const getLargeEnv: GetLargeEnvType = async <T = string>(
  key: string,
  schema?: z.ZodType<T, T | undefined>
) => {
  const { region, bucketName } = getBucketInfoFromEnv();

  const { value } = await handleLargeEnv(key, bucketName, region, schema);

  return value;
};

export const fetchLargeEnvs = async (schemaByKey: Record<string, z.ZodType> = {}) => {
  const keys = RedstoneCommon.getFromEnv(LARGE_ENV_KEYS_ENV_VAR, z.array(z.string()).optional());
  if (!keys) {
    return {};
  }

  const { region, bucketName } = getBucketInfoFromEnv();

  const data = await Promise.all(
    keys.map((key) => handleLargeEnv(key, bucketName, region, schemaByKey[key]))
  );
  return Object.fromEntries(data.map(({ key, value }) => [key, value]));
};

const handleLargeEnv = async <T = string>(
  key: string,
  bucketName: string,
  region?: string,
  schema?: z.ZodType<T, T | undefined>
) => {
  const value = await readS3Object<string>(bucketName, key, region);

  return { key, value: (schema ?? z.string()).parse(value) };
};

const getBucketInfoFromEnv = () => {
  return {
    region: RedstoneCommon.getFromEnv(LARGE_ENV_REGION_ENV_VAR, z.string().optional()),
    bucketName: RedstoneCommon.getFromEnv(LARGE_ENV_BUCKET_NAME_ENV_VAR),
  };
};
