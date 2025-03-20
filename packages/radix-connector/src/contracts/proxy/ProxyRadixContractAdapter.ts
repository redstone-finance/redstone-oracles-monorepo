import { RadixContractAdapter } from "../../radix/RadixContractAdapter";
import { SetGlobalContractAddressInvocationMethod } from "./methods/SetGlobalContractAddressInvocationMethod";

export class ProxyFeedRadixContractAdapter extends RadixContractAdapter {
  public async setContractGlobalAddress(address: string) {
    await this.client.call(
      new SetGlobalContractAddressInvocationMethod(this.componentId, address)
    );
  }
}
