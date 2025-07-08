import { getS3 } from "./aws-clients";
import { DEFAULT_AWS_REGION } from "./region";

export const writeS3Object = async (
  bucketName: string,
  path: string,
  data: unknown,
  region?: string,
  stringifyData = true
) => {
  const parsedData = stringifyData
    ? JSON.stringify(data, null, 2) + "\n"
    : (data as string);

  const params = {
    Bucket: bucketName,
    Key: path,
    ContentType: "application/json",
    Body: parsedData,
  };
  await getS3(region).putObject(params);
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

export const readS3Object = async <T>(
  bucketName: string,
  bucketKey: string,
  region = DEFAULT_AWS_REGION
): Promise<T | undefined> => {
  const params = {
    Bucket: bucketName,
    Key: bucketKey,
  };
  const data = await getS3(region).getObject(params);
  const contentAsString = await data.Body?.transformToString("utf-8");
  return contentAsString ? (JSON.parse(contentAsString) as T) : undefined;
};
