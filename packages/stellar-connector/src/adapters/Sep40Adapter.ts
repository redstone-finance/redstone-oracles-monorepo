import { Contract, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import {
  Asset,
  assetToScVal,
  getReturnValue,
  parseAsset,
  parseOptionalPriceData,
  parseOptionalPriceDataVec,
} from "../sep-40-utils";
import { StellarClient } from "../stellar/StellarClient";
import { RANDOM_ACCOUNT_FOR_SIMULATION } from "./StellarContractAdapter";

export class Sep40StellarContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async base(blockNumber?: number): Promise<Asset> {
    const operation = this.contract.call("base");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => parseAsset(getReturnValue(sim)),
      blockNumber
    );
  }

  async assets(blockNumber?: number): Promise<Asset[]> {
    const operation = this.contract.call("assets");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => getReturnValue(sim).vec()!.map(parseAsset),
      blockNumber
    );
  }

  async decimals(blockNumber?: number) {
    const operation = this.contract.call("decimals");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => scValToNative(getReturnValue(sim)) as number,
      blockNumber
    );
  }

  async resolution(blockNumber?: number) {
    const operation = this.contract.call("resolution");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => scValToNative(getReturnValue(sim)) as number,
      blockNumber
    );
  }

  async price(asset: Asset, timestamp: number, blockNumber?: number) {
    const operation = this.contract.call(
      "price",
      assetToScVal(asset),
      nativeToScVal(timestamp, { type: "u64" })
    );

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      parseOptionalPriceData,
      blockNumber
    );
  }

  async prices(asset: Asset, records: number, blockNumber?: number) {
    const operation = this.contract.call(
      "prices",
      assetToScVal(asset),
      nativeToScVal(records, { type: "u32" })
    );

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      parseOptionalPriceDataVec,
      blockNumber
    );
  }

  async lastprice(asset: Asset, blockNumber?: number) {
    const operation = this.contract.call("lastprice", assetToScVal(asset));

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      parseOptionalPriceData,
      blockNumber
    );
  }
}
