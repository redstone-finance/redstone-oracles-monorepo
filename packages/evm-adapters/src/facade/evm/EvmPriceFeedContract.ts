import { IPriceFeedContract } from "@redstone-finance/sdk";
import { PriceFeedWithRounds } from "../../../typechain-types";

export class EvmPriceFeedContract implements IPriceFeedContract {
  constructor(private contract: PriceFeedWithRounds) {}

  async latestAnswer(blockTag?: number) {
    return (await this.contract.latestAnswer({ blockTag })).toBigInt();
  }

  async decimals(blockTag?: number) {
    return await this.contract.decimals({ blockTag });
  }

  async getRoundData(roundId: bigint, blockTag?: number) {
    const roundData = await this.contract.getRoundData(roundId, { blockTag });

    return { answer: roundData.answer.toBigInt(), roundId: roundData.roundId.toBigInt() };
  }
}
