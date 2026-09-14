import { BigNumberish } from "starknet";

export type PriceFeedRoundData = { answer: BigNumberish };

export interface IPriceRoundsFeedContractAdapter {
  readLatestRoundData(): Promise<PriceFeedRoundData>;
}
