export interface IPriceFeedContract {
  latestAnswer(blockTag?: number): Promise<bigint>;

  getDataFeedId(blockTag?: number): Promise<string | undefined>;

  decimals?: (blockTag?: number) => Promise<number | undefined>;

  getRoundData?: (
    roundId: bigint,
    blockTag?: number
  ) => Promise<{ answer: bigint; roundId: bigint }>;
}
