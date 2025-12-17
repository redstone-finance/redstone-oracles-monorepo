import { IContractConnector, IExtendedPricesContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { PricesCantonContractAdapter } from "./PricesCantonContractAdapter";

export class PricesCantonContractConnector
  implements IContractConnector<IExtendedPricesContractAdapter>
{
  private adapter?: IExtendedPricesContractAdapter;

  constructor(
    private cantonClient: CantonClient,
    private updateCantonClient: CantonClient,
    private adapterId: string
  ) {}

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  waitForTransaction(_txId: string) {
    return Promise.resolve(true);
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
