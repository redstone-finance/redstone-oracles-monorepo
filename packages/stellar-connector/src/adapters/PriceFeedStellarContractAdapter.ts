import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import * as XdrUtils from "../XdrUtils";
import { RANDOM_ACCOUNT_FOR_SIMULATION } from "./StellarContractAdapter";

export class PriceFeedStellarContractAdapter implements IPriceFeedContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract
  ) {}

  async getPriceAndTimestamp(blockNumber?: number) {
    return await this.readPriceAndTimestamp(blockNumber);
  }

  async getDescription(blockNumber?: number) {
    const operation = this.contract.call("description");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, String),
      blockNumber
    );
  }

  async getDataFeedId(blockNumber?: number) {
    return await this.feedId(blockNumber);
  }

  async decimals(blockNumber?: number) {
    const operation = this.contract.call("decimals");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, Number),
      blockNumber
    );
  }

  async feedId(blockNumber?: number) {
    const operation = this.contract.call("feed_id");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, String),
      blockNumber
    );
  }

  async readPrice(blockNumber?: number) {
    const operation = this.contract.call("read_price");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseBigIntFromSimulation,
      blockNumber
    );
  }

  async readTimestamp(blockNumber?: number) {
    const operation = this.contract.call("read_timestamp");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, Number),
      blockNumber
    );
  }

  async readPriceAndTimestamp(blockNumber?: number) {
    const operation = this.contract.call("read_price_and_timestamp");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseReadPriceAndTimestampSimulation,
      blockNumber
    );
  }

  async readPriceData(blockNumber?: number) {
    const operation = this.contract.call("read_price_data");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseReadSinglePriceDataSimulation,
      blockNumber
    );
  }
}
