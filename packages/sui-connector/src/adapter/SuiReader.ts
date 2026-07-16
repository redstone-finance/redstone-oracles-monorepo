import { RedstoneCommon } from "@redstone-finance/utils";
import type { SuiClient } from "../client/SuiClient";

const LIMIT = 50;

export class SuiReader {
  constructor(private readonly client: SuiClient) {}

  async fetchObjectDataContent(input: { objectId: string }) {
    return await this.client.getObject(input.objectId);
  }

  async fetchAllDynamicFieldObjects(parentId: string) {
    const fieldIds = [];
    let cursor: string | undefined;

    do {
      const page = await this.client.listDynamicFields({
        parentId,
        limit: LIMIT,
        cursor,
      });
      fieldIds.push(
        ...page.dynamicFields.map(dynamicFieldObjectId).filter(RedstoneCommon.isDefined)
      );

      cursor = page.hasNextPage ? (page.cursor ?? undefined) : undefined;
    } while (cursor);

    return await this.client.getObjects(fieldIds);
  }
}

function dynamicFieldObjectId(field: { fieldId: string }) {
  const { fieldId, objectId } = field as { fieldId?: string; objectId?: string };

  return fieldId ?? objectId;
}
