import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { DEFAULT_STELLAR_CONFIG } from "../config";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarContractConnector } from "./StellarContractConnector";
import { StellarPricesContractAdapter } from "./StellarPricesContractAdapter";

export class PriceAdapterStellarContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: StellarPricesContractAdapter;

  constructor(
    rpcClient: StellarRpcClient,
    contractAddress: string,
    keypair?: Keypair,
    config = DEFAULT_STELLAR_CONFIG
  ) {
    super(rpcClient);

    this.adapter = new StellarPricesContractAdapter(
      rpcClient,
      new Contract(contractAddress),
      keypair,
      config
    );
  }

  override getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
