import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { Contract, providers, utils } from "ethers";
import { abi as PriceFeedWithRoundsAbi } from "../../../artifacts/contracts/price-feeds/with-rounds/PriceFeedWithRounds.sol/PriceFeedWithRounds.json";
import { PriceFeedWithRounds } from "../../../typechain-types";

export class EvmPriceFeedContractAdapter implements PriceFeedAdapter {
  private contract: PriceFeedWithRounds;

  constructor(provider: providers.Provider, address: string) {
    this.contract = new Contract(address, PriceFeedWithRoundsAbi, provider) as PriceFeedWithRounds;
  }

  async getPriceAndTimestamp(blockTag?: number) {
    const roundData = await this.contract.latestRoundData({ blockTag });

    return { value: roundData.answer.toBigInt(), timestamp: roundData.startedAt.toNumber() };
  }

  async getDescription(blockTag?: number) {
    return await this.contract.description({ blockTag });
  }

  async getDataFeedId(blockTag?: number) {
    const hexFeedId = await this.contract.getDataFeedId({ blockTag });

    return utils.parseBytes32String(hexFeedId);
  }

  async getDecimals(blockTag?: number) {
    return await this.contract.decimals({ blockTag });
  }

  async getRoundData(roundId: bigint, blockTag?: number) {
    const roundData = await this.contract.getRoundData(roundId, { blockTag });

    return { answer: roundData.answer.toBigInt(), roundId: roundData.roundId.toBigInt() };
  }
}
