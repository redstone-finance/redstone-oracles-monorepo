import { RadixClient } from "../../radix/RadixClient";
import { PriceAdapterRadixContractConnector } from "./PriceAdapterRadixContractConnector";
import { InstantiateRadixFunction } from "./methods/InstantiateRadixFunction";

export class PriceAdapterRadixContractDeployer extends PriceAdapterRadixContractConnector {
  constructor(
    client: RadixClient,
    private packageId: string,
    private signerCountThreshold: number,
    private signers: string[]
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
    return await this.client.call(
      new InstantiateRadixFunction(
        this.packageId,
        this.signerCountThreshold,
        this.signers
      )
    );
  }
}
