import { DescribeImagesCommand, ECRPUBLICClient } from "@aws-sdk/client-ecr-public";
import { getEcrPublicClient } from "./aws-clients";

export class AwsEcrPublic {
  constructor(private readonly client: ECRPUBLICClient = getEcrPublicClient()) {}

  async getImageTagsByDigest(repositoryName: string, imageDigest: string): Promise<string[]> {
    const command = new DescribeImagesCommand({
      repositoryName,
      imageIds: [{ imageDigest }],
    });
    const { imageDetails } = await this.client.send(command);
    return imageDetails?.[0]?.imageTags ?? [];
  }
}
