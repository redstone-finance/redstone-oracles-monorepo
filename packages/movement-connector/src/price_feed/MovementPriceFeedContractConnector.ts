import { Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "../MovementContractConnector";
import { MovementPriceFeedContractAdapter } from "./MovementPriceFeedContractAdapter";

export class MovementPriceFeedContractConnector extends MovementContractConnector<MovementPriceFeedContractAdapter> {
  constructor(
    client: Aptos,
    private readonly contractAddress: string
  ) {
    super(client);
  }

  override getAdapter() {
    return Promise.resolve(
      new MovementPriceFeedContractAdapter(this.client, this.contractAddress)
    );
  }
}
