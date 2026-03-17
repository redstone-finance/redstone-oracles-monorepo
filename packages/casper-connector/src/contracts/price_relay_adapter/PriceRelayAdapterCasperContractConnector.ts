import { CasperContractConnector } from "../../casper/CasperContractConnector";
import { PriceRelayAdapterCasperContractAdapter } from "./PriceRelayAdapterCasperContractAdapter";

export class PriceRelayAdapterCasperContractConnector extends CasperContractConnector<PriceRelayAdapterCasperContractAdapter> {
  getAdapter(): Promise<PriceRelayAdapterCasperContractAdapter> {
    return Promise.resolve(
      new PriceRelayAdapterCasperContractAdapter(this.connection, this.getContract())
    );
  }
}
