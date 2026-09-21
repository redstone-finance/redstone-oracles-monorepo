import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../client/StellarClient";
import { getFeedSymbol } from "../sep-40-asset-symbols";
import { isStellarAsset, Sep40Asset } from "../sep-40-types";
import { Sep40ContractReader } from "./Sep40ContractReader";
import { StellarTokenReader } from "./StellarTokenReader";

export class Sep40PriceFeedStellarContractAdapter implements PriceFeedAdapter {
  protected readonly contract: Contract;
  private readonly reader: Sep40ContractReader;
  private asset?: Sep40Asset;
  private tokenReader?: StellarTokenReader;

  constructor(
    private readonly client: StellarClient,
    contractId: string,
    private readonly feedId: string
  ) {
    this.contract = new Contract(contractId);
    this.reader = new Sep40ContractReader(client, this.contract);
  }

  getDescription() {
    return Promise.resolve(`Stellar SEP 40 ${this.feedId}`);
  }

  async getDataFeedId(blockNumber?: number) {
    const symbol = await this.readAssetSymbol(blockNumber);

    return getFeedSymbol(symbol, this.feedId);
  }

  async getDecimals(blockNumber?: number) {
    return await this.reader.decimals(blockNumber);
  }

  async getPriceAndTimestamp(blockNumber?: number) {
    const data = await this.reader.readLatestData(await this.getAsset(), blockNumber);
    if (!data) {
      throw new Error(`Couldn't find latest data for ${this.feedId}`);
    }

    return { value: data.price, timestamp: data.timestamp };
  }

  async getRoundData(roundId: bigint, blockNumber?: number) {
    const data = await this.reader.readRoundData(await this.getAsset(), roundId, blockNumber);
    if (!data) {
      throw new Error(`Couldn't find round data for ${this.feedId} in round ${roundId}`);
    }

    return { answer: data.price, roundId };
  }

  private async getAsset() {
    this.asset ??= await this.reader.feedToAsset(this.feedId);

    return this.asset;
  }

  private async readAssetSymbol(blockNumber?: number) {
    const asset = await this.getAsset();

    if (!isStellarAsset(asset)) {
      return asset.symbol;
    }

    this.tokenReader ??= new StellarTokenReader(this.client, asset.address.toString());

    return await this.tokenReader.symbol(blockNumber);
  }
}
