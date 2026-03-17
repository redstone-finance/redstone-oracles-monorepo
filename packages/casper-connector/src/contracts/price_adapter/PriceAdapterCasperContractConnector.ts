import { CasperContractConnector } from "../../casper/CasperContractConnector";
import { PriceAdapterCasperContractAdapter } from "./PriceAdapterCasperContractAdapter";

export class PriceAdapterCasperContractConnector extends CasperContractConnector<PriceAdapterCasperContractAdapter> {
  getAdapter(): Promise<PriceAdapterCasperContractAdapter> {
    return Promise.resolve(
      new PriceAdapterCasperContractAdapter(this.connection, this.getContract())
    );
  }
}
