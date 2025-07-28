import { loggerFactory } from "@redstone-finance/utils";
import {
  Address,
  Contract,
  Keypair,
  rpc,
  scValToBigInt,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { lastRoundDetailsFromXdrMap } from "./ContractData";
import { StellarRpcClient } from "./StellarRpcClient";

export class StellarPriceFeed {
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

  async init(feedId: string, adapterContractId: string, keypair: Keypair) {
    const operation = this.contract.call(
      "init",
      xdr.ScVal.scvString(feedId),
      xdr.ScVal.scvAddress(new Address(adapterContractId).toScAddress())
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

    return Number(scValToNative(sim.result!.retval));
  }

  async readPrice() {
    const operation = this.contract.call("read_price");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return scValToBigInt(sim.result!.retval);
  }

  async readTimestamp() {
    const operation = this.contract.call("read_timestamp");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    return Number(scValToNative(sim.result!.retval));
  }

  async readPriceAndTimestamp() {
    const operation = this.contract.call("read_price_and_timestamp");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    const vec = sim.result!.retval.vec()!;

    const price = scValToBigInt(vec[0]);
    const timestamp = Number(scValToNative(vec[1]));

    return {
      price,
      timestamp,
    };
  }

  async readPriceData() {
    const operation = this.contract.call("read_price_data");
    const sim = await this.rpcClient.simulateOperation(operation, this.sender);

    const map = sim.result!.retval.map()!;

    return lastRoundDetailsFromXdrMap(map);
  }
}
