import * as providers from "@ethersproject/providers";
import { parseBytes32String } from "@ethersproject/strings";
import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { evmContract } from "@redstone-finance/rpc-providers";
import { abi as PriceFeedWithRoundsAbi } from "../../../artifacts/contracts/price-feeds/with-rounds/PriceFeedWithRounds.sol/PriceFeedWithRounds.json";
import { PriceFeedWithRounds } from "../../../typechain-types";

export class EvmPriceFeedContractAdapter implements PriceFeedAdapter {
  private contract: PriceFeedWithRounds;

  constructor(provider: providers.Provider, address: string) {
    this.contract = evmContract<PriceFeedWithRounds>(address, PriceFeedWithRoundsAbi, provider);
  }

  async getPriceAndTimestamp(blockTag?: number) {
    const roundData = await this.contract.callStatic.latestRoundData({ blockTag });

    return { value: roundData.answer.toBigInt(), timestamp: roundData.startedAt.toNumber() };
  }

  async getDescription(blockTag?: number) {
    return await this.contract.callStatic.description({ blockTag });
  }

  async getDataFeedId(blockTag?: number) {
    const hexFeedId = await this.contract.callStatic.getDataFeedId({ blockTag });

    return parseBytes32String(hexFeedId);
  }

  async getDecimals(blockTag?: number) {
    return await this.contract.callStatic.decimals({ blockTag });
  }

  async getRoundData(roundId: bigint, blockTag?: number) {
    const roundData = await this.contract.callStatic.getRoundData(roundId, { blockTag });

    return { answer: roundData.answer.toBigInt(), roundId: roundData.roundId.toBigInt() };
  }
}
