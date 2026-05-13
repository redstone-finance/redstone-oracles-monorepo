import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { Contract } from "@stellar/stellar-sdk";
import { Sep40Asset } from "../sep-40-types";
import { StellarClient } from "../stellar/StellarClient";
import { Sep40ContractReader } from "./Sep40ContractReader";

export class Sep40PriceFeedStellarContractAdapter implements PriceFeedAdapter {
  protected readonly contract: Contract;
  private readonly reader: Sep40ContractReader;
  private asset?: Sep40Asset;

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
    this.asset ??= await this.reader.feedToAsset(this.feedId);

    const data = await this.reader.readLatestData(this.asset, blockNumber);
    if (!data) {
      throw new Error(`Couldn't find latest data for ${this.feedId}`);
    }

    return { value: data.price, timestamp: data.timestamp };
  }

  async getRoundData(roundId: bigint, blockNumber?: number) {
    this.asset ??= await this.reader.feedToAsset(this.feedId);

    const data = await this.reader.readRoundData(this.asset, roundId, blockNumber);
    if (!data) {
      throw new Error(`Couldn't find round data for ${this.feedId} in round ${roundId}`);
    }

    return { answer: data.price, roundId };
  }
}
