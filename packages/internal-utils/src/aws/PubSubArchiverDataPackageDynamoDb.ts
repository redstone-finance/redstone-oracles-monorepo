export type PubSubArchiverDataPackageDynamoDb = {
  timestamp: number;
  "dataPackageId#UUID": string;
  address: string;
  payload: string;
  pubSubName: string;
  expiresAt: number;
  dataFeedId?: string;
  signature?: string;
  value?: string | number;
};
