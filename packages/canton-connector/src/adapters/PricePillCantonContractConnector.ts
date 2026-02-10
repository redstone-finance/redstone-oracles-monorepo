import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { CantonContractConnector } from "./CantonContractConnector";
import { PricePillCantonContractAdapter } from "./PricePillCantonContractAdapter";

export class PricePillCantonContractConnector extends CantonContractConnector<IPriceFeedContractAdapter> {
  constructor(
    cantonClient: CantonClient,
    private readonly feedId: string
  ) {
    super(cantonClient);
  }

  getAdapter(): Promise<IPriceFeedContractAdapter> {
    return Promise.resolve(new PricePillCantonContractAdapter(this.cantonClient, this.feedId));
  }
}
