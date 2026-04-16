import { Contract, nativeToScVal } from "@stellar/stellar-sdk";
import {
  Sep40Asset,
  assetToScVal,
  parseAsset,
  parseAssets,
  parseOptionalPriceData,
  parseOptionalPriceDataVec,
} from "../sep-40-utils";
import { StellarClient } from "../stellar/StellarClient";

const BASE_METHOD = "base";
const ASSETS_METHOD = "assets";
const DECIMALS_METHOD = "decimals";
const RESOLUTION_METHOD = "resolution";
const PRICES_METHOD = "prices";
const LASTPRICE_METHOD = "lastprice";
const PRICE_METHOD = "price";

export class Sep40StellarContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async base(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: BASE_METHOD,
      },
      blockNumber,
      parseAsset
    );
  }

  async assets(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: ASSETS_METHOD,
      },
      blockNumber,
      parseAssets
    );
  }

  async decimals(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: DECIMALS_METHOD,
      },
      blockNumber,
      Number
    );
  }

  async resolution(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: RESOLUTION_METHOD,
      },
      blockNumber,
      Number
    );
  }

  async price(asset: Sep40Asset, timestamp: number, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: PRICE_METHOD,
        args: [assetToScVal(asset), nativeToScVal(timestamp, { type: "u64" })],
      },
      blockNumber,
      parseOptionalPriceData
    );
  }

  async prices(asset: Sep40Asset, records: number, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: PRICES_METHOD,
        args: [assetToScVal(asset), nativeToScVal(records, { type: "u32" })],
      },
      blockNumber,
      parseOptionalPriceDataVec
    );
  }

  // lastprice is a name taken from the sep40 interface and shouldn't be changed to lastPrice
  async lastprice(asset: Sep40Asset, blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: LASTPRICE_METHOD,
        args: [assetToScVal(asset)],
      },
      blockNumber,
      parseOptionalPriceData
    );
  }
}
