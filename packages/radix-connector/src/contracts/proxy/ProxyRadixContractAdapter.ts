import { Value } from "@radixdlt/radix-engine-toolkit";
import { RadixContractAdapter } from "../../radix/RadixContractAdapter";
import { SetRolaRadixInvocation } from "./methods/ChangeManagerRole";
import { SetGlobalContractAddressInvocationMethod } from "./methods/SetGlobalContractAddressInvocationMethod";

export class ProxyFeedRadixContractAdapter extends RadixContractAdapter {
  public async setContractGlobalAddress(address: string) {
    await this.client.call(
      new SetGlobalContractAddressInvocationMethod(this.componentId, address)
    );
  }

  public async changeManagerAccessRule(newAccessRule: Value) {
    await this.client.call(
      new SetRolaRadixInvocation(
        this.componentId,
        "proxy_man_auth",
        newAccessRule
      )
    );
  }
}
