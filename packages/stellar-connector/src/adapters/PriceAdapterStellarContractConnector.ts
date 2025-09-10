import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarTxDeliveryMan, StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryMan";
import { PriceAdapterStellarContractAdapter } from "./PriceAdapterStellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class PriceAdapterStellarContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: PriceAdapterStellarContractAdapter;

  constructor(
    rpcClient: StellarRpcClient,
    contractAddress: string,
    keypair?: Keypair,
    txDeliveryManConfig?: Partial<StellarTxDeliveryManConfig>
  ) {
    super(rpcClient, keypair);

    const txDeliveryMan = keypair
      ? new StellarTxDeliveryMan(rpcClient, keypair, txDeliveryManConfig)
      : undefined;

    this.adapter = new PriceAdapterStellarContractAdapter(
      rpcClient,
      new Contract(contractAddress),
      txDeliveryMan
    );
  }

  override getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
