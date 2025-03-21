import { address, decimal, Value } from "@radixdlt/radix-engine-toolkit";
import { VoidRadixInvocation } from "../radix/RadixInvocation";
import { TransferRadixTransaction } from "../radix/RadixTransaction";

export class TransferXRDRadixMethod extends VoidRadixInvocation {
  constructor(
    fromAccount: string,
    private toAccount: string,
    private xrdAddress: string,
    private amount: number
  ) {
    super(fromAccount, "withdraw");
  }

  override getParams(): Value[] {
    return [address(this.xrdAddress), decimal(this.amount)];
  }

  override getDedicatedTransaction(account: string) {
    return new TransferRadixTransaction(account, this.toAccount, [this]);
  }
}
