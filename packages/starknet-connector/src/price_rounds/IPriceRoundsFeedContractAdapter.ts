import { BigNumberish } from "@ethersproject/bignumber";

export type PriceFeedRoundData = { answer: BigNumberish };

export interface IPriceRoundsFeedContractAdapter {
  readLatestRoundData(): Promise<PriceFeedRoundData>;
}
