import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { getDynamoDbClient } from "./aws-clients";
import { currentAwsRegion } from "./region";

export class DynamoDbService {
  protected readonly db;
  protected readonly dbClient;

  public constructor(
    protected readonly tableName: string,
    region?: string,
    endpoint?: string
  ) {
    if (endpoint) {
      region ??= currentAwsRegion();
      this.dbClient = new DynamoDBClient({
        region,
        endpoint,
      });
    } else {
      this.dbClient = getDynamoDbClient(region);
    }
    this.db = DynamoDBDocumentClient.from(this.dbClient);
  }

  public async query<T = Record<string, unknown>>(input: Omit<QueryCommandInput, "TableName">) {
    const { Items } = await this.db.send(
      new QueryCommand({
        TableName: this.tableName,
        ...input,
      })
    );

    return Items as T[] | undefined;
  }

  public async get<T = Record<string, unknown>>(key: Record<string, unknown>) {
    const { Item } = await this.db.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      })
    );

    return Item as T | undefined;
  }

  public async write(item: Record<string, unknown>) {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  public async delete(key: Record<string, unknown>) {
    await this.db.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      })
    );
  }

  public async deleteMany(keys: Record<string, unknown>[]) {
    const requests = keys.map((key) => ({ DeleteRequest: { Key: key } }));

    console.log(`Requested deletes: ${keys.length}`);
    const { UnprocessedItems } = await this.db.send(
      new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: requests,
        },
      })
    );

    if (UnprocessedItems && Object.keys(UnprocessedItems).length) {
      console.warn("Some items were not processed:", UnprocessedItems);
    }
  }
}
