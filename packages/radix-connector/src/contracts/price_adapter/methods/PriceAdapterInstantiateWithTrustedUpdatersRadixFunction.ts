import { array, str, Value, ValueKind } from "@radixdlt/radix-engine-toolkit";
import { DEFAULT_INSTANTIATE_XRD_FEE } from "../../../radix/RadixClientConfig";
import { PriceAdapterInstantiateRadixFunction } from "./PriceAdapterInstantiateRadixFunction";

export class PriceAdapterInstantiateWithTrustedUpdatersRadixFunction extends PriceAdapterInstantiateRadixFunction {
  constructor(
    packageId: string,
    signerCountThreshold: number,
    signers: string[],
    private trustedUpdaters: string[],
    packageName = "PriceAdapter",
    fee = DEFAULT_INSTANTIATE_XRD_FEE
  ) {
    super(
      packageId,
      signerCountThreshold,
      signers,
      packageName,
      fee,
      "instantiate_with_trusted_updaters"
    );
  }

  override getParams(): Value[] {
    return [...super.getParams(), array(ValueKind.String, ...this.trustedUpdaters.map(str))];
  }

  override interpret(value: unknown[]) {
    return super.interpret(value[0]);
  }
}
