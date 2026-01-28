import { IExtendedPricesContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { CantonContractConnector } from "./CantonContractConnector";
import { PricesCantonContractAdapter } from "./PricesCantonContractAdapter";

export class PricesCantonContractConnector extends CantonContractConnector<IExtendedPricesContractAdapter> {
  private adapter?: IExtendedPricesContractAdapter;

  constructor(
    cantonClient: CantonClient,
    private updateCantonClient: CantonClient,
    private adapterId: string
  ) {
    super(cantonClient);
  }

  getAdapter(): Promise<IExtendedPricesContractAdapter> {
    this.adapter ??= new PricesCantonContractAdapter(
      this.cantonClient,
      this.updateCantonClient,
      this.adapterId
    );

    return Promise.resolve(this.adapter);
  }
}
