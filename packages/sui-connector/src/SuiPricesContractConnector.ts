import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import type { IContractConnector } from "@redstone-finance/sdk";
import { SuiConfig } from "./config";
import { SuiContractConnector } from "./SuiContractConnector";
import { SuiContractUpdater } from "./SuiContractUpdater";
import { SuiPricesContractAdapter } from "./SuiPricesContractAdapter";

export class SuiPricesContractConnector
  extends SuiContractConnector<SuiPricesContractAdapter>
  implements IContractConnector<SuiPricesContractAdapter>
{
  private adapter?: SuiPricesContractAdapter;

  constructor(
    client: SuiClient,
    private readonly config: SuiConfig,
    keypair?: Keypair,
    private readonly contractUpdater?: SuiContractUpdater
  ) {
    super(client, keypair);
  }

  override getAdapter(): Promise<SuiPricesContractAdapter> {
    this.adapter ??= new SuiPricesContractAdapter(
      this.client,
      this.config,
      this.getContractUpdater()
    );

    return Promise.resolve(this.adapter);
  }

  protected getContractUpdater() {
    return (
      this.contractUpdater ??
      (this.keypair
        ? SuiContractConnector.getCachedContractUpdater(this.client, this.keypair, this.config)
        : undefined)
    );
  }
}
