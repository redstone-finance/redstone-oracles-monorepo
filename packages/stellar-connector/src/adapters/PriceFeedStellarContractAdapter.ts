import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import * as XdrUtils from "../XdrUtils";

const DECIMALS_METHOD = "decimals";
const FEED_ID_METHOD = "feed_id";
const READ_PRICE_METHOD = "read_price";
const READ_TIMESTAMP_METHOD = "read_timestamp";
const READ_PRICE_AND_TIMESTAMP_METHOD = "read_price_and_timestamp";
const READ_PRICE_DATA_METHOD = "read_price_data";

export class PriceFeedStellarContractAdapter implements IPriceFeedContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async getPriceAndTimestamp(blockNumber?: number) {
    return await this.readPriceAndTimestamp(blockNumber);
  }

  async getDescription(blockNumber?: number) {
    return await this.client.call<string>(
      {
        method: "description",
        contract: this.contract,
      },
      blockNumber
    );
  }

  async getDataFeedId(blockNumber?: number) {
    return await this.feedId(blockNumber);
  }

  async decimals(blockNumber?: number) {
    return await this.client.call(
      {
        method: DECIMALS_METHOD,
        contract: this.contract,
      },
      blockNumber,
      Number
    );
  }

  async feedId(blockNumber?: number) {
    return await this.client.call<string>(
      {
        method: FEED_ID_METHOD,
        contract: this.contract,
      },
      blockNumber
    );
  }

  async readPrice(blockNumber?: number) {
    return await this.client.call<bigint>(
      {
        method: READ_PRICE_METHOD,
        contract: this.contract,
      },
      blockNumber
    );
  }

  async readTimestamp(blockNumber?: number) {
    return await this.client.call(
      {
        method: READ_TIMESTAMP_METHOD,
        contract: this.contract,
      },
      blockNumber,
      Number
    );
  }

  async readPriceAndTimestamp(blockNumber?: number) {
    return await this.client.call(
      {
        method: READ_PRICE_AND_TIMESTAMP_METHOD,
        contract: this.contract,
      },
      blockNumber,
      XdrUtils.parsePriceAndTimestamp
    );
  }

  async readPriceData(blockNumber?: number) {
    return await this.client.call(
      {
        method: READ_PRICE_DATA_METHOD,
        contract: this.contract,
      },
      blockNumber,
      XdrUtils.parsePriceData
    );
  }
}
