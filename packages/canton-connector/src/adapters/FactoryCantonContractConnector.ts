import { IExtendedPricesContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { CantonContractConnector } from "./CantonContractConnector";
import { FactoryCantonContractAdapter } from "./FactoryCantonContractAdapter";

export class CoreFactoryCantonContractConnector extends CantonContractConnector<IExtendedPricesContractAdapter> {
  private adapter?: IExtendedPricesContractAdapter;

  constructor(
    cantonClient: CantonClient,
    private readonly ownerCantonClient: CantonClient,
    private readonly adapterId: string
  ) {
    super(cantonClient);
  }

  getAdapter(): Promise<IExtendedPricesContractAdapter> {
    this.adapter ??= new FactoryCantonContractAdapter(
      this.cantonClient,
      this.ownerCantonClient,
      this.adapterId
    );

    return Promise.resolve(this.adapter);
  }
}
