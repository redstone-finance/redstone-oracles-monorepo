import { HttpClient } from "@redstone-finance/http-client";
import { RedstoneCommon } from "@redstone-finance/utils";
import xml2js from "xml2js";

type S3ListItem = {
  LastModified: string;
  Key: string;
  ETag?: string;
};

export interface IConfigDataLoader {
  currentUpdateLastModified(configFileName?: string): Promise<string>;
  currentConfigFile(configFileName?: string): Promise<S3ListItem>;
}

export class ConfigDataLoader implements IConfigDataLoader {
  private readonly remoteConfigApiEndpoint: string;
  private readonly remoteConfigApiKey: string;
  private readonly httpClient?: HttpClient;

  constructor(
    remoteConfigApiEndpoint: string,
    remoteConfigApiKey: string,
    httpClient?: HttpClient
  ) {
    this.remoteConfigApiEndpoint = remoteConfigApiEndpoint;
    this.remoteConfigApiKey = remoteConfigApiKey;
    this.httpClient = httpClient;
  }

  public async currentUpdateLastModified(
    configFileName?: string
  ): Promise<string> {
    const configFileS3Item = await this.currentConfigFile(configFileName);

    return configFileS3Item.LastModified;
  }

  public async currentConfigFile(configFileName?: string): Promise<S3ListItem> {
    const response = this.httpClient
      ? await this.httpClient.get(this.remoteConfigApiEndpoint, {
          headers: { "x-api-key": this.remoteConfigApiKey },
        })
      : await RedstoneCommon.axiosGetWithRetries(this.remoteConfigApiEndpoint, {
          headers: { "x-api-key": this.remoteConfigApiKey },
          maxRetries: 1,
        });

    const xmlData = (await response.data) as string;
    const xmlParser = new xml2js.Parser({ explicitArray: false });
    const parsedData = (await xmlParser.parseStringPromise(xmlData)) as {
      ListBucketResult: { Contents?: S3ListItem[] };
    };

    if (!parsedData.ListBucketResult.Contents) {
      throw new Error(`No items found in S3 ${this.remoteConfigApiEndpoint}`);
    }

    const contents: S3ListItem[] = Array.isArray(
      parsedData.ListBucketResult.Contents
    )
      ? parsedData.ListBucketResult.Contents
      : [parsedData.ListBucketResult.Contents];

    const configFileS3Item = contents.find(
      (item) => item.Key === configFileName
    );

    if (!configFileS3Item) {
      throw new Error(
        `Config file ${configFileName} not found in ${this.remoteConfigApiEndpoint}`
      );
    }

    return configFileS3Item;
  }
}
