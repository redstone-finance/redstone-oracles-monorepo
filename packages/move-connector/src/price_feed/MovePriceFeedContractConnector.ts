import { MoveClient } from "../MoveClient";
import { MoveContractConnector } from "../MoveContractConnector";
import { MovePriceFeedContractAdapter } from "./MovePriceFeedContractAdapter";

export class MovePriceFeedContractConnector extends MoveContractConnector<MovePriceFeedContractAdapter> {
  constructor(
    client: MoveClient,
    private readonly contractAddress: string
  ) {
    super(client);
  }

  override getAdapter() {
    return Promise.resolve(new MovePriceFeedContractAdapter(this.client, this.contractAddress));
  }
}
