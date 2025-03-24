import { address, Value } from "@radixdlt/radix-engine-toolkit";
import { RadixFunction } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";
import { makeOption, makeOwnerUpdatableRole } from "../../../radix/utils";

export class ProxyInstantiateRadixFunction extends RadixFunction<string> {
  constructor(
    packageId: string,
    private multiSigAccessRule: Value,
    private globalContractAddress?: string
  ) {
    super(packageId, "instantiate", "Proxy");
  }

  override getParams() {
    return [
      makeOwnerUpdatableRole(this.multiSigAccessRule),
      this.multiSigAccessRule,
      makeOption(address, this.globalContractAddress),
    ];
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this]);
  }
}
