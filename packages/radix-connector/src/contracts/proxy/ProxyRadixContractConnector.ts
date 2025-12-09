import { RadixContractConnector } from "../../radix/RadixContractConnector";
import { ProxyFeedRadixContractAdapter } from "./ProxyRadixContractAdapter";

export class ProxyRadixContractConnector extends RadixContractConnector<ProxyFeedRadixContractAdapter> {
  // eslint-disable-next-line @typescript-eslint/require-await -- add reason here, please
  async getComponentId() {
    return this.componentId!;
  }

  override async getAdapter(): Promise<ProxyFeedRadixContractAdapter> {
    return new ProxyFeedRadixContractAdapter(this.client, await this.getComponentId());
  }
}
