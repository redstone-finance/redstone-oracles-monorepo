import { RadixClient } from "../../radix/RadixClient";
import { RadixContractConnector } from "../../radix/RadixContractConnector";
import { PriceAdapterRadixContractAdapter } from "./PriceAdapterRadixContractAdapter";

export class PriceAdapterRadixContractConnector extends RadixContractConnector<PriceAdapterRadixContractAdapter> {
  private adapter?: PriceAdapterRadixContractAdapter;

  constructor(client: RadixClient, componentId?: string) {
    super(client, componentId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- add reason here, please
  async getComponentId() {
    return this.componentId!;
  }

  override async getAdapter() {
    this.adapter ??= new PriceAdapterRadixContractAdapter(this.client, await this.getComponentId());

    return this.adapter;
  }
}
