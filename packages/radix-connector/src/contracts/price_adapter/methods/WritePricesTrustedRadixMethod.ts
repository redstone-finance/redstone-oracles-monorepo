import { ProvingRadixTransaction } from "../../../radix/RadixTransaction";
import { NonFungibleGlobalIdInput } from "../../../radix/utils";
import { GetPricesRadixMethod } from "./GetPricesRadixMethod";

export class WritePricesTrustedRadixMethod extends GetPricesRadixMethod {
  constructor(
    componentId: string,
    dataFeedIds: string[],
    payloadData: number[],
    private proofBadge: NonFungibleGlobalIdInput,
    fee = dataFeedIds.length * 1.5
  ) {
    super(
      componentId,
      dataFeedIds,
      payloadData,
      fee,
      "write_prices_raw_trusted"
    );
  }

  override getDedicatedTransaction(account: string, maxFeeOverride?: number) {
    return new ProvingRadixTransaction(
      account,
      [this],
      this.proofBadge,
      maxFeeOverride ?? this.fee
    );
  }
}
