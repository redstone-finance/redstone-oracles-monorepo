import { Aptos } from "@aptos-labs/ts-sdk";
import { MoveContractConnector } from "../MoveContractConnector";
import { MovePriceFeedContractAdapter } from "./MovePriceFeedContractAdapter";

export class MovePriceFeedContractConnector extends MoveContractConnector<MovePriceFeedContractAdapter> {
  constructor(
    client: Aptos,
    private readonly contractAddress: string
  ) {
    super(client);
  }

  override getAdapter() {
    return Promise.resolve(
      new MovePriceFeedContractAdapter(this.client, this.contractAddress)
    );
  }
}
