import { CantonClient } from "../CantonClient";
import { CantonContractConnector } from "./CantonContractConnector";
import { PricePillCantonContractAdapter } from "./PricePillCantonContractAdapter";

export class PricePillCantonContractConnector extends CantonContractConnector<PricePillCantonContractAdapter> {
  constructor(
    cantonClient: CantonClient,
    private readonly partyId: string,
    protected adapterId: string,
    private readonly feedId: string
  ) {
    super(cantonClient);
  }

  getAdapter(): Promise<PricePillCantonContractAdapter> {
    return Promise.resolve(
      new PricePillCantonContractAdapter(
        this.cantonClient,
        this.partyId,
        this.adapterId,
        this.feedId
      )
    );
  }
}
