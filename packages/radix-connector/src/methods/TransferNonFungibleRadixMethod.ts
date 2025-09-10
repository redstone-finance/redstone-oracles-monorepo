import {
  address,
  array,
  nonFungibleLocalId,
  Value,
  ValueKind,
} from "@radixdlt/radix-engine-toolkit";
import { VoidRadixInvocation } from "../radix/RadixInvocation";
import { TransferRadixTransaction } from "../radix/RadixTransaction";
import { NonFungibleGlobalIdInput } from "../radix/utils";

export class TransferNonFungibleRadixMethod extends VoidRadixInvocation {
  constructor(
    fromAccount: string,
    private toAccount: string,
    private badge: NonFungibleGlobalIdInput
  ) {
    super(fromAccount, "withdraw_non_fungibles");
  }

  override getParams(): Value[] {
    return [
      address(this.badge.resourceAddress),
      array(ValueKind.NonFungibleLocalId, nonFungibleLocalId(this.badge.localId)),
    ];
  }

  override getDedicatedTransaction(account: string) {
    return new TransferRadixTransaction(account, this.toAccount, [this]);
  }
}
