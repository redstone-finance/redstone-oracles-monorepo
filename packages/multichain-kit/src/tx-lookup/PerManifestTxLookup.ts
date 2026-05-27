import type {
  ManifestRef,
  NormalizedContractTx,
  NormalizedTopUpEntry,
  TxLookup,
  TxLookupArgs,
} from "./TxLookup";

export type PerManifestResult = {
  data: NormalizedContractTx[];
  topUps?: NormalizedTopUpEntry[];
} & ({ hasNextPage: true; nextCursor: string } | { hasNextPage?: false; nextCursor?: undefined });

type CursorMap = Partial<Record<string, string>>;

export abstract class PerManifestTxLookup implements TxLookup<CursorMap> {
  async fetchPage({ manifests, startBlock, endBlock, cursor }: TxLookupArgs<CursorMap>) {
    const active =
      cursor === undefined ? manifests : manifests.filter((a) => a.adapterContract in cursor);

    const results = await Promise.all(
      active.map(async (manifest) => {
        const innerCursor = cursor?.[manifest.adapterContract];
        const result = await this.fetchForManifest(manifest, startBlock, endBlock, innerCursor);

        return { manifest, result };
      })
    );

    const data: NormalizedContractTx[] = [];
    const topUps: NormalizedTopUpEntry[] = [];
    const nextCursorMap: CursorMap = {};

    for (const { manifest, result } of results) {
      data.push(...result.data);
      topUps.push(...(result.topUps ?? []));

      if (result.hasNextPage) {
        nextCursorMap[manifest.adapterContract] = result.nextCursor;
      }
    }

    const topUpsOrUndefined = topUps.length > 0 ? topUps : undefined;

    if (Object.keys(nextCursorMap).length > 0) {
      return {
        data,
        topUps: topUpsOrUndefined,
        hasNextPage: true as const,
        nextCursor: nextCursorMap,
      };
    }

    return { data, topUps: topUpsOrUndefined, hasNextPage: false as const };
  }

  protected abstract fetchForManifest(
    manifest: ManifestRef,
    startBlock: number,
    endBlock: number,
    cursor?: string
  ): Promise<PerManifestResult>;
}
