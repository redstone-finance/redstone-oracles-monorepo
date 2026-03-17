import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { LegacyIContractConnector, LegacyPricesContractAdapter } from "../LegacyInterfaces";
import { WriteContractAdapter } from "../WriteContractAdapter";
import { ForwardCompatibleContractAdapter } from "./ForwardCompatibleAdapter";

export class ForwardCompatibleWriteContractAdapter
  extends ForwardCompatibleContractAdapter
  implements WriteContractAdapter
{
  constructor(private readonly writeAdapter: LegacyPricesContractAdapter) {
    super(writeAdapter);
  }

  static override async fromConnector(
    connector: LegacyIContractConnector<LegacyPricesContractAdapter>
  ) {
    return new ForwardCompatibleWriteContractAdapter(await connector.getAdapter());
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const result = await this.writeAdapter.writePricesFromPayloadToContract(
      paramsProvider,
      options
    );

    return String(result);
  }

  async getSignerAddress() {
    const address = await this.writeAdapter.getSignerAddress();
    if (!address) {
      throw new Error("Signer address not available on underlying adapter");
    }

    return address;
  }
}
