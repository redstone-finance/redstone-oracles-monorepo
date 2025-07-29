import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { StellarContractAdapter } from "./StellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class StellarPriceAdapterContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: StellarContractAdapter;

  constructor(rpc: rpc.Server, keypair: Keypair, contractAddress: string) {
    super(rpc);

    this.adapter = new StellarContractAdapter(rpc, keypair, contractAddress);
  }

  getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
