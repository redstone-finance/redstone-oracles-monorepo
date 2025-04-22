import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import type { IContractConnector } from "@redstone-finance/sdk";
import { SuiConfig } from "./config";
import { SuiContractConnector } from "./SuiContractConnector";
import { SuiPricesContractAdapter } from "./SuiPricesContractAdapter";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";

export class SuiPricesContractConnector
  extends SuiContractConnector<SuiPricesContractAdapter>
  implements IContractConnector<SuiPricesContractAdapter>
{
  private adapter?: SuiPricesContractAdapter;

  constructor(
    client: SuiClient,
    private readonly config: SuiConfig,
    keypair?: Keypair,
    private readonly txDeliveryMan?: SuiTxDeliveryMan
  ) {
    super(client, keypair);
  }

  override getAdapter(): Promise<SuiPricesContractAdapter> {
    if (!this.adapter) {
      this.adapter = new SuiPricesContractAdapter(
        this.client,
        this.config,
        this.getTxDeliveryMan()
      );
    }

    return Promise.resolve(this.adapter);
  }

  protected getTxDeliveryMan() {
    return (
      this.txDeliveryMan ??
      (this.keypair
        ? SuiContractConnector.getCachedDeliveryMan(this.client, this.keypair)
        : undefined)
    );
  }
}
