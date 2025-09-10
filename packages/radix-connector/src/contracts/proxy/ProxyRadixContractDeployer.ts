import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { RadixClient } from "../../radix/RadixClient";
import { makeMultisigAccessRule } from "../../radix/utils";
import { ProxyInstantiateRadixFunction } from "./methods/ProxyInstantiateRadixFunction";
import { ProxyRadixContractConnector } from "./ProxyRadixContractConnector";

export class ProxyRadixContractDeployer extends ProxyRadixContractConnector {
  constructor(
    client: RadixClient,
    private packageId: string,
    private threshold: number,
    private multisignaturePublicKeys: string[],
    private contractGlobalAddress?: string,
    private networkId: number = NetworkId.Stokenet
  ) {
    super(client);
  }

  override async getComponentId() {
    if (this.componentId) {
      return this.componentId;
    }

    this.componentId = await this.instantiate();

    return this.componentId;
  }

  private async instantiate() {
    return await this.client.call(
      new ProxyInstantiateRadixFunction(
        this.packageId,
        await makeMultisigAccessRule(this.threshold, this.multisignaturePublicKeys, this.networkId),
        this.contractGlobalAddress
      )
    );
  }
}
