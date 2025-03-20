import { address } from "@radixdlt/radix-engine-toolkit";
import { VoidRadixInvocation } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";

export class SetGlobalContractAddressInvocationMethod extends VoidRadixInvocation {
  constructor(
    componentId: string,
    private contractGlobalAddress: string
  ) {
    super(componentId, "set_contract_global_address");
  }

  override getParams() {
    return [address(this.contractGlobalAddress)];
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this]);
  }
}
