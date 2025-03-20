import { Value } from "@radixdlt/radix-engine-toolkit";
import { BigNumberish } from "ethers";
import { RadixInvocation } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";
import { makeBytes, makeFeedIds } from "../../../radix/utils";

export interface PricesAndTimestamp {
  values: BigNumberish[];
  timestamp: number;
}

export class GetPricesRadixMethod extends RadixInvocation<PricesAndTimestamp> {
  constructor(
    componentId: string,
    private dataFeedIds: string[],
    private payloadBytes: number[],
    protected fee = dataFeedIds.length,
    name: string = "get_prices_raw"
  ) {
    super(componentId, name);
  }

  override getDedicatedTransaction(account: string, maxFeeOverride?: number) {
    return new RadixTransaction(account, [this], maxFeeOverride ?? this.fee);
  }

  override getParams(): Value[] {
    return [makeFeedIds(this.dataFeedIds), makeBytes(this.payloadBytes)];
  }

  override interpret(value: unknown[]) {
    return {
      timestamp: value[0] as number,
      values: value[1] as BigNumberish[],
    };
  }
}
