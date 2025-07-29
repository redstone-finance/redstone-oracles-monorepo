import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { rpc } from "@stellar/stellar-sdk";
import { StellarContractConnector } from "./StellarContractConnector";
import { StellarPriceFeed } from "./StellarPriceFeed";

export class StellarPriceFeedContractConnector extends StellarContractConnector<IPriceFeedContractAdapter> {
  private readonly priceFeed: StellarPriceFeed;

  constructor(rpc: rpc.Server, contractAddress: string, sender: string) {
    super(rpc);

    this.priceFeed = new StellarPriceFeed(rpc, contractAddress, sender);
  }

  async getAdapter() {
    return await Promise.resolve(this.priceFeed);
  }
}
