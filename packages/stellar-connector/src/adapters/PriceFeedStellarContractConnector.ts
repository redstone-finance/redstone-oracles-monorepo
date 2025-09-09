import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarTxDeliveryMan } from "../stellar/StellarTxDeliveryMan";
import { PriceFeedStellarContractAdapter } from "./PriceFeedStellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class PriceFeedStellarContractConnector extends StellarContractConnector<IPriceFeedContractAdapter> {
  private readonly priceFeedAdapter: PriceFeedStellarContractAdapter;

  constructor(
    rpcClient: StellarRpcClient,
    contractAddress: string,
    keypair: Keypair
  ) {
    super(rpcClient, keypair);

    this.priceFeedAdapter = new PriceFeedStellarContractAdapter(
      rpcClient,
      new Contract(contractAddress),
      new StellarTxDeliveryMan(rpcClient, keypair)
    );
  }

  override getAdapter() {
    return Promise.resolve(this.priceFeedAdapter);
  }
}
