import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "../MovementContractConnector";
import { MovementOptionsContractUtil } from "../MovementOptionsContractUtil";
import { TransactionConfig } from "../types";
import { MovementPriceAdapterContractViewer } from "./MovementPriceAdapterContractViewer";
import { MovementPriceAdapterContractWriter } from "./MovementPriceAdapterContractWriter";
import { MovementPricesContractAdapter } from "./MovementPricesContractAdapter";

export class MovementPricesContractConnector extends MovementContractConnector<MovementPricesContractAdapter> {
  private readonly adapter: MovementPricesContractAdapter;

  constructor(
    client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    private readonly account?: Account,
    private readonly config?: TransactionConfig
  ) {
    super(client);

    this.adapter = new MovementPricesContractAdapter({
      writer: this.account
        ? MovementPriceAdapterContractWriter.createMultiWriter(
            this.client,
            this.account,
            args.packageObjectAddress,
            args.priceAdapterObjectAddress,
            new MovementOptionsContractUtil(this.client),
            this.config
          )
        : undefined,
      viewer: MovementPriceAdapterContractViewer.createMultiReader(
        this.client,
        args.packageObjectAddress,
        args.priceAdapterObjectAddress
      ),
    });
  }

  override async getAdapter(): Promise<MovementPricesContractAdapter> {
    return await Promise.resolve(this.adapter);
  }
}
