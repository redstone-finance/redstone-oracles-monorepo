import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "../MovementContractConnector";
import { MovementTxDeliveryMan } from "../MovementTxDeliveryMan";
import { TransactionConfig } from "../types";
import { MovementPriceAdapterContractViewer } from "./MovementPriceAdapterContractViewer";
import { MovementPriceAdapterContractWriter } from "./MovementPriceAdapterContractWriter";
import { MovementPricesContractAdapter } from "./MovementPricesContractAdapter";

export class MovementPricesContractConnector extends MovementContractConnector<MovementPricesContractAdapter> {
  private readonly adapter: MovementPricesContractAdapter;

  constructor(
    client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    account?: Account,
    config?: TransactionConfig
  ) {
    super(client);

    const txDeliveryMan = account
      ? new MovementTxDeliveryMan(client, account, config)
      : undefined;

    this.adapter = new MovementPricesContractAdapter(
      MovementPriceAdapterContractViewer.createMultiReader(
        this.client,
        args.packageObjectAddress,
        args.priceAdapterObjectAddress
      ),
      txDeliveryMan
        ? new MovementPriceAdapterContractWriter(
            txDeliveryMan,
            args.packageObjectAddress,
            args.priceAdapterObjectAddress
          )
        : undefined
    );
  }

  override getAdapter(): Promise<MovementPricesContractAdapter> {
    return Promise.resolve(this.adapter);
  }
}
