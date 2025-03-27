import { ManifestBuilder, Value } from "@radixdlt/radix-engine-toolkit";
import { VoidRadixInvocation } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";
import { makeSetRolaArg } from "../../../radix/utils";

export class SetRolaRadixInvocation extends VoidRadixInvocation {
  constructor(
    componentId: string,
    subject: string,
    private newAccessRule: Value
  ) {
    super(componentId, subject);
  }

  override appendTo(builder: ManifestBuilder): ManifestBuilder {
    return builder.callRoleAssignmentMethod(
      this.subject,
      "set",
      makeSetRolaArg(this.name, this.newAccessRule)
    );
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this]);
  }
}
