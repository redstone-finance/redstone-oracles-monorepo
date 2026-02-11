import { PaginatedTransactionResponse, SuiClient } from "@mysten/sui/client";
import { RedstoneCommon } from "@redstone-finance/utils";

export class SuiReader {
  constructor(private readonly client: SuiClient) {}

  async fetchObjectDataContent(
    input: { objectId: string; version?: number },
    blockNumber?: number
  ) {
    if (blockNumber) {
      let version = input.version;
      if (!version) {
        version = await this.findLatestVersionAtCheckpoint(input.objectId, blockNumber);

        if (!version) {
          throw new Error(`No version of ${input.objectId} found for ${blockNumber}`);
        }
      }

      const object = await this.client.tryGetPastObject({
        id: input.objectId,
        version,
        options: { showContent: true },
      });

      if (object.status !== "VersionFound") {
        throw new Error(`Failed to find past object: ${RedstoneCommon.stringify(object)}`);
      }

      if (!object.details.content) {
        throw new Error("Object details not found or have no content");
      }

      return object.details.content;
    }

    const object = await this.client.getObject({
      id: input.objectId,
      options: { showContent: true },
    });

    if (!object.data?.content) {
      throw new Error("Object not found or has no content");
    }

    return object.data.content;
  }

  async getObjectIds(pricesTableId: string) {
    const dynamicFields = await this.client.getDynamicFields({
      parentId: pricesTableId,
    });
    if (dynamicFields.data.length === 0) {
      return [];
    }

    return dynamicFields.data.map((field) => ({
      objectId: field.objectId,
      version: Number(field.version),
    }));
  }

  private async findLatestVersionAtCheckpoint(objectId: string, checkpointNumber: number) {
    await RedstoneCommon.waitForBlockNumber(
      () => this.client.getLatestCheckpointSequenceNumber().then(Number),
      checkpointNumber,
      `findLatestVersion ${objectId} at ${checkpointNumber}`
    );

    let cursor = undefined;
    do {
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          ChangedObject: objectId,
        },
        options: {
          showObjectChanges: true,
        },
        cursor,
      });

      const result = SuiReader.checkPage(transactions, checkpointNumber, objectId);

      if (result) {
        return result;
      }

      cursor = transactions.nextCursor;
    } while (cursor);

    return undefined;
  }

  static checkPage(
    transactions: PaginatedTransactionResponse,
    checkpointNumber: number,
    objectId: string
  ) {
    for (const tx of transactions.data) {
      if (Number(tx.checkpoint) <= checkpointNumber) {
        const objectChange = tx.objectChanges?.find(
          (change) => "objectId" in change && change.objectId === objectId
        );
        if (objectChange !== undefined) {
          return Number(objectChange.version);
        }
      }
    }

    return undefined;
  }
}
