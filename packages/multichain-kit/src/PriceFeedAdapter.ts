export interface PriceAndTimestamp {
  value: bigint;
  timestamp: number;
}

export interface PriceFeedAdapter {
  getPriceAndTimestamp(blockTag?: number): Promise<PriceAndTimestamp>;

  getDecimals(blockTag?: number): Promise<number | undefined>;
  getDescription(blockTag?: number): Promise<string | undefined>;
  getDataFeedId(blockTag?: number): Promise<string | undefined>;

  getRoundData?: (
    roundId: bigint,
    blockTag?: number
  ) => Promise<{ answer: bigint; roundId: bigint }>;
}
