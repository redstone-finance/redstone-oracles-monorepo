import { RadixClient } from "../../radix/RadixClient";
import { PriceAdapterRadixContractConnector } from "./PriceAdapterRadixContractConnector";
import { PriceAdapterInstantiateRadixFunction } from "./methods/PriceAdapterInstantiateRadixFunction";
import { PriceAdapterInstantiateWithTrustedUpdatersRadixFunction } from "./methods/PriceAdapterInstantiateWithTrustedUpdatersRadixFunction";

export class PriceAdapterRadixContractDeployer extends PriceAdapterRadixContractConnector {
  constructor(
    client: RadixClient,
    private packageId: string,
    private signerCountThreshold: number,
    private signers: string[],
    private trustedUpdaters?: string[]
  ) {
    super(client);
  }

  override async getComponentId() {
    if (this.componentId) {
      return this.componentId;
    }

    this.componentId = await this.instantiate();

    return await super.getComponentId();
  }

  private async instantiate() {
    if (!this.trustedUpdaters?.length) {
      return await this.client.call(
        new PriceAdapterInstantiateRadixFunction(
          this.packageId,
          this.signerCountThreshold,
          this.signers
        )
      );
    }

    const updaters = await Promise.all(
      this.trustedUpdaters.map(async (addressString) => {
        return await RadixClient.getAddressDataHex(addressString);
      })
    );

    return await this.client.call(
      new PriceAdapterInstantiateWithTrustedUpdatersRadixFunction(
        this.packageId,
        this.signerCountThreshold,
        this.signers,
        updaters
      )
    );
  }
}
