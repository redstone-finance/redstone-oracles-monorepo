import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { Contract, Keypair, rpc } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "./StellarRpcClient";
import * as XdrUtils from "./XdrUtils";

export class StellarPriceFeed implements IPriceFeedContractAdapter {
  private readonly logger = loggerFactory("stellar-price-feed");

  private readonly contract: Contract;
  private readonly rpcClient: StellarRpcClient;

  constructor(
    rpc: rpc.Server,
    contractAddress: string,
    private readonly sender: string
  ) {
    this.contract = new Contract(contractAddress);
    this.rpcClient = new StellarRpcClient(rpc);
  }

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
