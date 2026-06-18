import { _Object } from "@aws-sdk/client-s3";
import { gzipSync } from "node:zlib";
import { getS3 } from "./aws-clients";
import { DEFAULT_AWS_REGION } from "./region";

export type S3ObjectWithKey = _Object & { Key: string };

export const writeS3Object = async (
  bucketName: string,
  path: string,
  data: unknown,
  region?: string,
  stringifyData = true
) => {
  const parsedData = stringifyData ? JSON.stringify(data, null, 2) + "\n" : (data as string);

  const params = {
    Bucket: bucketName,
    Key: path,
    ContentType: "application/json",
    Body: parsedData,
  };
  await getS3(region).putObject(params);
};

export const writeCompressedS3Object = async (
  bucketName: string,
  path: string,
  data: unknown,
  region?: string
) => {
  await getS3(region).putObject({
    Bucket: bucketName,
    Key: path,
    Body: gzipSync(Buffer.from(JSON.stringify(data), "utf-8")),
    ContentType: "application/json",
    ContentEncoding: "gzip",
  });
};

export const writeDownloadableS3Object = async (
  bucketName: string,
  path: string,
  data: unknown,
  contentType: string,
  region?: string
) => {
  const params = {
    Bucket: bucketName,
    Key: path,
    ContentType: contentType,
    Body: data as string,
    ContentDisposition: `attachment; filename="${path.split("/").pop()}"`,
  };

  await getS3(region).putObject(params);
};

export const readS3Text = async (
  bucketName: string,
  bucketKey: string,
  region = DEFAULT_AWS_REGION
) => {
  const params = {
    Bucket: bucketName,
    Key: bucketKey,
  };
  const data = await getS3(region).getObject(params);
  const contentAsString = await data.Body?.transformToString("utf-8");

  return {
    ...data,
    contentAsString,
  };
};

export const readS3ObjectWithMetadata = async <T>(
  bucketName: string,
  bucketKey: string,
  region = DEFAULT_AWS_REGION
) => {
  const { contentAsString, ...data } = await readS3Text(bucketName, bucketKey, region);
  const content = contentAsString ? (JSON.parse(contentAsString) as T) : undefined;

  return {
    ...data,
    content,
  };
};

export const readS3Object = async <T>(
  bucketName: string,
  bucketKey: string,
  region = DEFAULT_AWS_REGION
): Promise<T | undefined> => {
  const { content } = await readS3ObjectWithMetadata<T>(bucketName, bucketKey, region);

  return content;
};

export const listS3ObjectsWithMetadata = async (
  bucketName: string,
  prefix: string,
  region = DEFAULT_AWS_REGION
): Promise<S3ObjectWithKey[]> => {
  const params = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  const data = await getS3(region).listObjectsV2(params);

  return data.Contents?.filter((obj): obj is S3ObjectWithKey => !!obj.Key) ?? [];
};

export const listS3Objects = async (
  bucketName: string,
  prefix: string,
  region = DEFAULT_AWS_REGION
): Promise<string[]> => {
  const contents = await listS3ObjectsWithMetadata(bucketName, prefix, region);

  return contents.map((obj) => obj.Key);
};
