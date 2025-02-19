import { Account, AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "./MovementContractConnector";
import { MovementOptionsContractUtil } from "./MovementOptionsContractUtil";
import { MovementPricesContractAdapter } from "./MovementPricesContractAdapter";
import { MovementViewContractAdapter } from "./MovementViewContractAdapter";
import { MovementWriteContractAdapter } from "./MovementWriteContractAdapter";
import { IMovementContractAdapter, TransactionConfig } from "./types";
export class MovementPricesContractConnector extends MovementContractConnector<MovementPricesContractAdapter> {
  private readonly packageObjectAddress: AccountAddress;
  private readonly priceAdapterObjectAddress: AccountAddress;

  constructor(
    client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    private readonly account?: Account,
    private readonly config?: TransactionConfig
  ) {
    super(client);
    this.packageObjectAddress = AccountAddress.fromString(
      args.packageObjectAddress
    );
    this.priceAdapterObjectAddress = AccountAddress.fromString(
      args.priceAdapterObjectAddress
    );
  }

  override getAdapter(): Promise<MovementPricesContractAdapter> {
    const adapter: IMovementContractAdapter = {
      writer: this.account
        ? new MovementWriteContractAdapter(
            this.client,
            this.account,
            this.packageObjectAddress,
            this.priceAdapterObjectAddress,
            new MovementOptionsContractUtil(this.client),
            this.config
          )
        : undefined,
      viewer: new MovementViewContractAdapter(
        this.client,
        this.packageObjectAddress,
        this.priceAdapterObjectAddress
      ),
    };

    return Promise.resolve(new MovementPricesContractAdapter(adapter));
  }
}
