import { formatBytes32String } from "@ethersproject/strings";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PriceFeedsAdapterWithRounds } from "../../../typechain-types";
import { PriceFeedsEvmContractAdapter } from "./PriceFeedsEvmContractAdapter";

export class PriceFeedsEvmContractAdapterWithRounds<
  Contract extends PriceFeedsAdapterWithRounds,
> extends PriceFeedsEvmContractAdapter<Contract> {
  async getLatestRoundIds(feedIds: string[], numberOfRounds: number, blockTag?: number) {
    const roundId = (await this.adapterContract.getLatestRoundId({ blockTag })).toBigInt();
    const roundArr = Array.from({ length: numberOfRounds }, (_, i) =>
      roundId > BigInt(i) ? roundId - BigInt(i) : undefined
    ).filter(RedstoneCommon.isDefined);

    // Returning for all feeds roundId, roundId - 1, or undefined when roundId < numberOfRounds
    return feedIds.map(() => roundArr);
  }

  async getValueForDataFeedAndRound(feedId: string, roundId: bigint, blockTag?: number) {
    return (
      await this.adapterContract.getValueForDataFeedAndRound(formatBytes32String(feedId), roundId, {
        blockTag,
      })
    ).toBigInt();
  }
}
