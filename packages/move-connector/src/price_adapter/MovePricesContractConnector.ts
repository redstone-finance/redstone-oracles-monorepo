import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { MoveContractConnector } from "../MoveContractConnector";
import { MoveTxDeliveryMan } from "../MoveTxDeliveryMan";
import { TransactionConfig } from "../types";
import { MovePriceAdapterContractViewer } from "./MovePriceAdapterContractViewer";
import { MovePriceAdapterContractWriter } from "./MovePriceAdapterContractWriter";
import { MovePricesContractAdapter } from "./MovePricesContractAdapter";

export class MovePricesContractConnector extends MoveContractConnector<MovePricesContractAdapter> {
  private readonly adapter: MovePricesContractAdapter;

  constructor(
    client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    account?: Account,
    config?: TransactionConfig
  ) {
    super(client);

    const txDeliveryMan = account
      ? MoveTxDeliveryMan.createMultiTxDeliveryMan(client, account, config)
      : undefined;

    this.adapter = new MovePricesContractAdapter(
      MovePriceAdapterContractViewer.createMultiReader(
        this.client,
        args.packageObjectAddress,
        args.priceAdapterObjectAddress
      ),
      txDeliveryMan
        ? new MovePriceAdapterContractWriter(
            txDeliveryMan,
            args.packageObjectAddress,
            args.priceAdapterObjectAddress
          )
        : undefined
    );
  }

  override getAdapter(): Promise<MovePricesContractAdapter> {
    return Promise.resolve(this.adapter);
  }
}
