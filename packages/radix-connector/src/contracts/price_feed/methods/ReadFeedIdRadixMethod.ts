import { ContractParamsProvider } from "@redstone-finance/sdk";
import { BytesLike } from "ethers";
import { ValueProxyRadixInvocation } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";

export class ReadFeedIdRadixMethod extends ValueProxyRadixInvocation<string> {
  constructor(component: string) {
    super(component, "get_feed_id");
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this]);
  }

  override interpret(value: unknown) {
    return ContractParamsProvider.unhexlifyFeedId(value as BytesLike);
  }
}
