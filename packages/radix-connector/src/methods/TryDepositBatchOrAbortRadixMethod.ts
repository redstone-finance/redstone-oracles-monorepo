import {
  enumeration,
  Expression,
  expression,
  Value,
} from "@radixdlt/radix-engine-toolkit";
import { VoidRadixInvocation } from "../radix/RadixInvocation";

export class TryDepositBatchOrAbortRadixMethod extends VoidRadixInvocation {
  constructor(component: string) {
    super(component, "try_deposit_batch_or_abort");
  }

  override getParams(): Value[] {
    return [expression(Expression.EntireWorktop), enumeration(0)];
  }
}
