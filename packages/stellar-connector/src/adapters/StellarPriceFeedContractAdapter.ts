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
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parsePrimitiveFromSimulation(sim, String);
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
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parsePrimitiveFromSimulation(sim, Number);
  }

  async feedId() {
    const operation = this.contract.call("feed_id");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parsePrimitiveFromSimulation(sim, String);
  }

  async readPrice() {
    const operation = this.contract.call("read_price");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parseBigIntFromSimulation(sim);
  }

  async readTimestamp() {
    const operation = this.contract.call("read_timestamp");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parsePrimitiveFromSimulation(sim, Number);
  }

  async readPriceAndTimestamp() {
    const operation = this.contract.call("read_price_and_timestamp");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parseReadPriceAndTimestampSimulation(sim);
  }

  async readPriceData() {
    const operation = this.contract.call("read_price_data");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return XdrUtils.parseReadSinglePriceDataSimulation(sim);
  }
}
