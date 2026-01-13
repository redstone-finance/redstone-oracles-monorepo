import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import * as XdrUtils from "../XdrUtils";
import { StellarContractAdapter } from "./StellarContractAdapter";

export class PriceFeedStellarContractAdapter
  extends StellarContractAdapter
  implements IPriceFeedContractAdapter
{
  async getPriceAndTimestamp() {
    return await this.readPriceAndTimestamp();
  }

  async getDescription() {
    const operation = this.contract.call("description");

    return await this.client.simulateOperation(operation, await this.getPublicKey(), (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async getDataFeedId() {
    return await this.feedId();
  }

  async init(owner: string, feedId: string) {
    return await this.initContract(owner, XdrUtils.stringToScVal(feedId));
  }

  async decimals() {
    const operation = this.contract.call("decimals");

    return await this.client.simulateOperation(operation, await this.getPublicKey(), (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async feedId() {
    const operation = this.contract.call("feed_id");

    return await this.client.simulateOperation(operation, await this.getPublicKey(), (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async readPrice() {
    const operation = this.contract.call("read_price");

    return await this.client.simulateOperation(
      operation,
      await this.getPublicKey(),
      XdrUtils.parseBigIntFromSimulation
    );
  }

  async readTimestamp() {
    const operation = this.contract.call("read_timestamp");

    return await this.client.simulateOperation(operation, await this.getPublicKey(), (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async readPriceAndTimestamp() {
    const operation = this.contract.call("read_price_and_timestamp");

    return await this.client.simulateOperation(
      operation,
      await this.getPublicKey(),
      XdrUtils.parseReadPriceAndTimestampSimulation
    );
  }

  async readPriceData() {
    const operation = this.contract.call("read_price_data");

    return await this.client.simulateOperation(
      operation,
      await this.getPublicKey(),
      XdrUtils.parseReadSinglePriceDataSimulation
    );
  }

  override getExtendInstanceTtlOperation() {
    return this.contract.call("read_timestamp");
  }
}
