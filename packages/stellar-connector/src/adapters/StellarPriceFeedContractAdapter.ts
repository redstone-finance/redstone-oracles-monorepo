import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import * as XdrUtils from "../XdrUtils";

export class StellarPriceFeedContractAdapter
  implements IPriceFeedContractAdapter
{
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly contract: Contract,
    private readonly sender: string
  ) {}

  async getPriceAndTimestamp() {
    return await this.readPriceAndTimestamp();
  }

  async getDescription() {
    const operation = this.contract.call("description");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async getDataFeedId() {
    return await this.feedId();
  }

  async init(feedId: string, adapterContractId: string, keypair: Keypair) {
    const operation = this.contract.call(
      "init",
      XdrUtils.stringToScVal(feedId),
      XdrUtils.addressToScVal(adapterContractId)
    );

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      keypair
    );

    return await this.rpcClient.waitForTx(submitResponse.hash);
  }

  async decimals() {
    const operation = this.contract.call("decimals");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async feedId() {
    const operation = this.contract.call("feed_id");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, String)
    );
  }

  async readPrice() {
    const operation = this.contract.call("read_price");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      XdrUtils.parseBigIntFromSimulation
    );
  }

  async readTimestamp() {
    const operation = this.contract.call("read_timestamp");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      (sim) => XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async readPriceAndTimestamp() {
    const operation = this.contract.call("read_price_and_timestamp");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      XdrUtils.parseReadPriceAndTimestampSimulation
    );
  }

  async readPriceData() {
    const operation = this.contract.call("read_price_data");

    return await this.rpcClient.simulateOperation(
      operation,
      this.sender,
      XdrUtils.parseReadSinglePriceDataSimulation
    );
  }
}
