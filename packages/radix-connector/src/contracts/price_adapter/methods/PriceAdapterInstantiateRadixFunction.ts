import { u8, Value } from "@radixdlt/radix-engine-toolkit";
import { DEFAULT_INSTANTIATE_XRD_FEE } from "../../../radix/RadixClientConfig";
import { RadixFunction } from "../../../radix/RadixInvocation";
import { RadixTransaction } from "../../../radix/RadixTransaction";
import { makeSigners } from "../../../radix/utils";

export class PriceAdapterInstantiateRadixFunction extends RadixFunction<string> {
  constructor(
    packageId: string,
    private signerCountThreshold: number,
    private signers: string[],
    packageName = "PriceAdapter",
    private fee = DEFAULT_INSTANTIATE_XRD_FEE,
    functionName = "instantiate"
  ) {
    super(packageId, functionName, packageName);
  }

  override getParams(): Value[] {
    return [u8(this.signerCountThreshold), makeSigners(this.signers)];
  }

  override getDedicatedTransaction(account: string) {
    return new RadixTransaction(account, [this], this.fee);
  }
}
