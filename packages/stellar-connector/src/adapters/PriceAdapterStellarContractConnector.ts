import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryMan";
import { StellarContractConnector } from "./StellarContractConnector";
import { StellarPricesContractAdapter } from "./StellarPricesContractAdapter";

export class PriceAdapterStellarContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: StellarPricesContractAdapter;

  constructor(
    rpcClient: StellarRpcClient,
    contractAddress: string,
    keypair?: Keypair,
    txDeliveryManConfig?: Partial<StellarTxDeliveryManConfig>
  ) {
    super(rpcClient);

    this.adapter = new StellarPricesContractAdapter(
      rpcClient,
      new Contract(contractAddress),
      keypair,
      txDeliveryManConfig
    );
  }

  override getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
