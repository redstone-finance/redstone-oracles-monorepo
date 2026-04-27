import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { Sep40ContractReader } from "./Sep40ContractReader";

export class Sep40PriceFeedStellarContractAdapter implements PriceFeedAdapter {
  protected readonly contract: Contract;
  private readonly reader: Sep40ContractReader;

  constructor(
    client: StellarClient,
    contractId: string,
    private readonly feedId: string
  ) {
    this.contract = new Contract(contractId);
    this.reader = new Sep40ContractReader(client, this.contract);
  }

  getDescription() {
    return Promise.resolve(`Stellar SEP 40 ${this.feedId}`);
  }

  getDataFeedId() {
    return Promise.resolve(this.feedId);
  }

  async getDecimals(blockNumber?: number) {
    return await this.reader.decimals(blockNumber);
  }

  async getPriceAndTimestamp(blockNumber?: number) {
    const data = await this.reader.readLatestData(this.feedId, blockNumber);
    if (!data) {
      throw new Error(`Couldn't find latest data for ${this.feedId}`);
    }

    return { value: data.price, timestamp: data.timestamp };
  }

  async getRoundData(roundId: bigint, blockNumber?: number) {
    const data = await this.reader.readRoundData(this.feedId, roundId, blockNumber);
    if (!data) {
      throw new Error(`Couldn't find round data for ${this.feedId} in round ${roundId}`);
    }

    return { answer: data.price, roundId };
  }
}
