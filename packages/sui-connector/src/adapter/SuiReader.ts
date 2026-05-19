import type { SuiClient } from "../client/SuiClient";

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

      const pageValues = await Promise.all(
        page.dynamicFields.map((field) => this.client.getDynamicFieldValue(parentId, field.name))
      );
      results.push(...pageValues);

      cursor = page.hasNextPage ? (page.cursor ?? undefined) : undefined;
    } while (cursor);

    return results;
  }
}
