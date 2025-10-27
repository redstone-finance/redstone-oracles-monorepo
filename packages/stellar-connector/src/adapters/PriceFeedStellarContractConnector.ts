import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarOperationSender } from "../stellar/StellarOperationSender";
import { StellarSigner } from "../stellar/StellarSigner";
import { PriceFeedStellarContractAdapter } from "./PriceFeedStellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class PriceFeedStellarContractConnector extends StellarContractConnector<IPriceFeedContractAdapter> {
  private readonly priceFeedAdapter: PriceFeedStellarContractAdapter;

  constructor(client: StellarClient, contractAddress: string, keypair: Keypair) {
    super(client, keypair);

    this.priceFeedAdapter = new PriceFeedStellarContractAdapter(
      client,
      new Contract(contractAddress),
      new StellarOperationSender(new StellarSigner(keypair), client)
    );
  }

  override getAdapter() {
    return Promise.resolve(this.priceFeedAdapter);
  }
}
