import { BigNumberish } from "ethers";

export interface PriceAndTimestamp {
  value: BigNumberish;
  timestamp: number;
}

export interface IPriceFeedContractAdapter {
  getPriceAndTimestamp(blockTag?: number): Promise<PriceAndTimestamp>;
  decimals?: (blockTag?: number) => Promise<number>;

  getDescription?: (blockTag?: number) => Promise<string>;
  getDataFeedId?: (blockTag?: number) => Promise<string>;
}
