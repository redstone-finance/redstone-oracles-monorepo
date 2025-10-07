import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarTxDeliveryMan, StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryMan";
import { PriceAdapterStellarContractAdapter } from "./PriceAdapterStellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class PriceAdapterStellarContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: PriceAdapterStellarContractAdapter;

  constructor(
    client: StellarClient,
    contractAddress: string,
    keypair?: Keypair,
    txDeliveryManConfig?: Partial<StellarTxDeliveryManConfig>
  ) {
    super(client, keypair);

    const txDeliveryMan = keypair
      ? new StellarTxDeliveryMan(client, keypair, txDeliveryManConfig)
      : undefined;

    this.adapter = new PriceAdapterStellarContractAdapter(
      client,
      new Contract(contractAddress),
      txDeliveryMan
    );
  }

  override getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
