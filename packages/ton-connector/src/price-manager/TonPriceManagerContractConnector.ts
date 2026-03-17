import { TonPriceManager } from "../../wrappers/TonPriceManager";
import { TonContractConnector } from "../TonContractConnector";
import { TonNetwork } from "../network/TonNetwork";
import { TonPriceManagerContractAdapter } from "./TonPriceManagerContractAdapter";

export class TonPriceManagerContractConnector extends TonContractConnector<
  TonPriceManager,
  TonPriceManagerContractAdapter
> {
  constructor(network: TonNetwork, address: string) {
    super(TonPriceManager, network, address);
  }

  async getAdapter(): Promise<TonPriceManagerContractAdapter> {
    return new TonPriceManagerContractAdapter(await this.getContract());
  }
}
