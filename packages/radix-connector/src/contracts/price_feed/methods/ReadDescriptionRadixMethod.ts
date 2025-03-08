import { ValueProxyRadixInvocation } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";

export class ReadDescriptionRadixMethod extends ValueProxyRadixInvocation<string> {
  constructor(component: string) {
    super(component, "get_description");
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this]);
  }

  override interpret(value: unknown) {
    return super.interpret(value);
  }
}
