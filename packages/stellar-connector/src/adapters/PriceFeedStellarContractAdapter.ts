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

  async getPriceAndTimestamp() {
    return await this.readPriceAndTimestamp();
  }

  async getDescription() {
    const operation = this.contract.call("description");

    return await this.client.simulateOperation(operation, RANDOM_ACCOUNT_FOR_SIMULATION, (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async getDataFeedId() {
    return await this.feedId();
  }

  async decimals() {
    const operation = this.contract.call("decimals");

    return await this.client.simulateOperation(operation, RANDOM_ACCOUNT_FOR_SIMULATION, (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async feedId() {
    const operation = this.contract.call("feed_id");

    return await this.client.simulateOperation(operation, RANDOM_ACCOUNT_FOR_SIMULATION, (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async readPrice() {
    const operation = this.contract.call("read_price");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseBigIntFromSimulation
    );
  }

  async readTimestamp() {
    const operation = this.contract.call("read_timestamp");

    return await this.client.simulateOperation(operation, RANDOM_ACCOUNT_FOR_SIMULATION, (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async readPriceAndTimestamp() {
    const operation = this.contract.call("read_price_and_timestamp");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseReadPriceAndTimestampSimulation
    );
  }

  async readPriceData() {
    const operation = this.contract.call("read_price_data");

    return await this.client.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      XdrUtils.parseReadSinglePriceDataSimulation
    );
  }
}
