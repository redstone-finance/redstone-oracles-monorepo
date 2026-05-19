export interface NormalizedSuiTx {
  checkpoint: number;
  timestampMs: number;
  digest: string;
  sender: string;
  gasBudget: string;
  gasPrice: string;
  writePricePayloads: string[];
  targetObjectId?: string;
  effects?: unknown;
  events?: unknown;
}

export interface SuiTxLookupPage {
  data: NormalizedSuiTx[];
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface SuiTxLookup {
  queryAffectedObjectTransactions(args: {
    objectId: string;
    cursor?: string;
  }): Promise<SuiTxLookupPage>;
}
