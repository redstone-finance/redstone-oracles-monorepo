import { IPriceFeedContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { CantonContractConnector } from "./CantonContractConnector";
import { PriceFeedEntryCantonContractAdapter } from "./PriceFeedEntryCantonContractAdapter";

export class PriceFeedEntryCantonContractConnector extends CantonContractConnector<IPriceFeedContractAdapter> {
  constructor(
    cantonClient: CantonClient,
    private feedId: string
  ) {
    super(cantonClient);
  }

  getAdapter(): Promise<IPriceFeedContractAdapter> {
    return Promise.resolve(new PriceFeedEntryCantonContractAdapter(this.cantonClient, this.feedId));
  }
}
