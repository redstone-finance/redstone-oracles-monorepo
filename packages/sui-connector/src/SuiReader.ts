import type { SuiClient } from "./SuiClient";

const LIMIT = 50;

export class SuiReader {
  constructor(private readonly client: SuiClient) {}

  async fetchObjectDataContent(input: { objectId: string }) {
    return await this.client.getObject(input.objectId);
  }

  async fetchAllDynamicFieldContents(parentId: string) {
    const results = [];
    let cursor: string | undefined;

    do {
      const page = await this.client.listDynamicFields({
        parentId,
        limit: LIMIT,
        cursor,
      });

      for (const field of page.dynamicFields) {
        const obj = await this.client.getDynamicFieldValue(parentId, field.name);
        results.push(obj);
      }

      cursor = page.hasNextPage ? (page.cursor ?? undefined) : undefined;
    } while (cursor);

    return results;
  }
}
