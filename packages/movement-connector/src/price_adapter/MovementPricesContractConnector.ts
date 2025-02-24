import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "../MovementContractConnector";
import { MovementOptionsContractUtil } from "../MovementOptionsContractUtil";
import { IMovementContractAdapter, TransactionConfig } from "../types";
import { MovementPriceAdapterContractViewer } from "./MovementPriceAdapterContractViewer";
import { MovementPriceAdapterContractWriter } from "./MovementPriceAdapterContractWriter";
import { MovementPricesContractAdapter } from "./MovementPricesContractAdapter";

export class MovementPricesContractConnector extends MovementContractConnector<MovementPricesContractAdapter> {
  private readonly packageObjectAddress: string;
  private readonly priceAdapterObjectAddress: string;

  constructor(
    client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    private readonly account?: Account,
    private readonly config?: TransactionConfig
  ) {
    super(client);
    this.packageObjectAddress = args.packageObjectAddress;
    this.priceAdapterObjectAddress = args.priceAdapterObjectAddress;
  }

  override getAdapter(): Promise<MovementPricesContractAdapter> {
    const adapter: IMovementContractAdapter = {
      writer: this.account
        ? new MovementPriceAdapterContractWriter(
            this.client,
            this.account,
            this.packageObjectAddress,
            this.priceAdapterObjectAddress,
            new MovementOptionsContractUtil(this.client),
            this.config
          )
        : undefined,
      viewer: new MovementPriceAdapterContractViewer(
        this.client,
        this.packageObjectAddress,
        this.priceAdapterObjectAddress
      ),
    };

    return Promise.resolve(new MovementPricesContractAdapter(adapter));
  }
}
