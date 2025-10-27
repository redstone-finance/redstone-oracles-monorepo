import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarOperationSender } from "../stellar/StellarOperationSender";
import { StellarSigner } from "../stellar/StellarSigner";
import { StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryManConfig";
import { PriceAdapterStellarContractAdapter } from "./PriceAdapterStellarContractAdapter";
import { StellarContractConnector } from "./StellarContractConnector";

export class PriceAdapterStellarContractConnector extends StellarContractConnector<IPricesContractAdapter> {
  private readonly adapter: PriceAdapterStellarContractAdapter;

  constructor(
    client: StellarClient,
    contractAddress: string,
    keypair?: Keypair,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    super(client, keypair);

    const sender = keypair
      ? new StellarOperationSender(new StellarSigner(keypair), client, config)
      : undefined;

    this.adapter = new PriceAdapterStellarContractAdapter(
      client,
      new Contract(contractAddress),
      sender
    );
  }

  override getAdapter() {
    return Promise.resolve(this.adapter);
  }
}
