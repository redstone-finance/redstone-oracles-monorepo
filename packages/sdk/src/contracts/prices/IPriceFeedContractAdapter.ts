import { BigNumberish } from "ethers";

export interface PriceAndTimestamp {
  value: BigNumberish;
  timestamp: number;
}

export interface IPriceFeedContractAdapter {
  getPriceAndTimestamp(): Promise<PriceAndTimestamp>;

  getDescription?: () => Promise<string>;
  getDataFeedId?: () => Promise<string>;
}
