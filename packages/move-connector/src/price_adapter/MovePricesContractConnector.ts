import { Account } from "@aptos-labs/ts-sdk";
import { MoveClient } from "../MoveClient";
import { MoveContractConnector } from "../MoveContractConnector";
import { MoveTxDeliveryMan } from "../MoveTxDeliveryMan";
import { TransactionConfig } from "../types";
import { MovePriceAdapterContractViewer } from "./MovePriceAdapterContractViewer";
import { MovePriceAdapterContractWriter } from "./MovePriceAdapterContractWriter";
import { MovePricesContractAdapter } from "./MovePricesContractAdapter";

export class MovePricesContractConnector extends MoveContractConnector<MovePricesContractAdapter> {
  private readonly adapter: MovePricesContractAdapter;

  constructor(
    client: MoveClient,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    account?: Account,
    config?: TransactionConfig
  ) {
    super(client);

    const txDeliveryMan = account
      ? new MoveTxDeliveryMan(client, account, config)
      : undefined;

    this.adapter = new MovePricesContractAdapter(
      new MovePriceAdapterContractViewer(
        client,
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
