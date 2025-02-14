import { SuiClient } from "@mysten/sui/client";
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
        version = await this.findLatestVersionAtCheckpoint(
          input.objectId,
          blockNumber
        );

        if (!version) {
          throw new Error(
            `No version of ${input.objectId} found for ${blockNumber}`
          );
        }
      }

      const object = await this.client.tryGetPastObject({
        id: input.objectId,
        version,
        options: { showContent: true },
      });

      if (object.status !== "VersionFound") {
        throw new Error(
          `Failed to find past object: ${RedstoneCommon.stringify(object)}`
        );
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
      throw new Error("Dynamic fields not found");
    }

    return dynamicFields.data.map((field) => ({
      objectId: field.objectId,
      version: Number(field.version),
    }));
  }

  private async findLatestVersionAtCheckpoint(
    objectId: string,
    checkpointNumber: number
  ) {
    const transactions = await this.client.queryTransactionBlocks({
      filter: {
        InputObject: objectId,
      },
      options: {
        showObjectChanges: true,
      },
    });

    if (!transactions.data.length) {
      return;
    }

    const targetTx = transactions.data.find(
      (tx) => Number(tx.checkpoint) <= checkpointNumber
    );

    if (!targetTx) {
      return;
    }

    const objectChange = targetTx.objectChanges?.find(
      (change) => "objectId" in change && change.objectId === objectId
    );

    return objectChange ? Number(objectChange.version) : undefined;
  }
}
