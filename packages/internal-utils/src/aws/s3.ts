import { S3 } from "@aws-sdk/client-s3";

const s3 = new S3({ region: "eu-west-1" });

export const writeS3Object = async (
  bucketName: string,
  path: string,
  data: unknown
) => {
  const params = {
    Bucket: bucketName,
    Key: path,
    ContentType: "application/json",
    Body: JSON.stringify(data, null, 2) + "\n",
  };
  await s3.putObject(params);
};

export const readS3Object = async <T>(
  bucketName: string,
  bucketKey: string
): Promise<T | undefined> => {
  const params = {
    Bucket: bucketName,
    Key: bucketKey,
  };
  const data = await s3.getObject(params);
  const contentAsString = await data.Body?.transformToString("utf-8");
  return contentAsString ? (JSON.parse(contentAsString) as T) : undefined;
};
