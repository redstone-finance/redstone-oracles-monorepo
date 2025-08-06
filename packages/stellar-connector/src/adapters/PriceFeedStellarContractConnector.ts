import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarContractConnector } from "./StellarContractConnector";
import { StellarPriceFeedContractAdapter } from "./StellarPriceFeedContractAdapter";

export class PriceFeedStellarContractConnector extends StellarContractConnector<IPriceFeedContractAdapter> {
  private readonly priceFeedAdapter: StellarPriceFeedContractAdapter;

  constructor(
    rpcClient: StellarRpcClient,
    contractAddress: string,
    sender: string
  ) {
    super(rpcClient);

    this.priceFeedAdapter = new StellarPriceFeedContractAdapter(
      rpcClient,
      new Contract(contractAddress),
      sender
    );
  }

  override getAdapter() {
    return Promise.resolve(this.priceFeedAdapter);
  }
}
