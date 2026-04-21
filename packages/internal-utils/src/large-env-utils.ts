import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { readS3Object } from "./aws/s3";

type LargeEnvConfig =
  | {
      region?: string;
      bucketName: string;
      useLocal: false;
    }
  | {
      useLocal: true;
    };

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
  const { value } = await handleLargeEnv(key, schema);

  return value;
};

export const fetchLargeEnvs = async (schemaByKey: Record<string, z.ZodType> = {}) => {
  const keys = RedstoneCommon.getFromEnv(LARGE_ENV_KEYS_ENV_VAR, z.array(z.string()).optional());
  if (!keys) {
    return {};
  }

  const data = await Promise.all(keys.map((key) => handleLargeEnv(key, schemaByKey[key])));
  return Object.fromEntries(data.map(({ key, value }) => [key, value]));
};

const handleLargeEnv = async <T = string>(key: string, schema?: z.ZodType<T, T | undefined>) => {
  const bucketInfo = getBucketInfoFromEnv();

  if (bucketInfo.useLocal) {
    return { key, value: RedstoneCommon.getFromEnv(key, schema) };
  }

  const value = await readS3Object<string>(bucketInfo.bucketName, key, bucketInfo.region);

  return { key, value: (schema ?? z.string()).parse(value) };
};

let largeEnvConfig: LargeEnvConfig | undefined;
const getBucketInfoFromEnv = (): LargeEnvConfig => {
  if (!largeEnvConfig) {
    const useLocal = RedstoneCommon.getFromEnv("USE_LOCAL_LARGE_ENV", z.boolean().default(false));

    if (useLocal) {
      largeEnvConfig = {
        useLocal,
      };
    } else {
      largeEnvConfig = {
        useLocal: false,
        region: RedstoneCommon.getFromEnv(LARGE_ENV_REGION_ENV_VAR, z.string().optional()),
        bucketName: RedstoneCommon.getFromEnv(LARGE_ENV_BUCKET_NAME_ENV_VAR),
      };
    }
  }

  return largeEnvConfig;
};
