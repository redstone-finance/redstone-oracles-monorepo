import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue } from "../conversions";
import { ActiveContractData, DamlTuple2 } from "../utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";
import {
  DEFS_KEY_CORE_FEATURED,
  DEFS_KEY_FEATURED_APP_RIGHT,
} from "./CoreFeaturedCantonContractAdapter";

export const CORE_FEATURED_CLIENT_TEMPLATE_NAME = `RedStoneCoreFeaturedClient:RedStoneCoreFeaturedClient`;
const GET_PRICES_DISCLOSED_CHOICE = "GetPricesDisclosed";

export class CoreClientCantonContractAdapter extends CoreCantonContractAdapter {
  constructor(
    client: CantonClient,
    contractId: string,
    packageId: string,
    private coreActiveContractData: Required<ActiveContractData> = client.Defs[
      DEFS_KEY_CORE_FEATURED
    ],
    private featuredActiveContractData: Required<ActiveContractData> = client.Defs[
      DEFS_KEY_FEATURED_APP_RIGHT
    ],
    templateName = CORE_FEATURED_CLIENT_TEMPLATE_NAME
  ) {
    super(client, "", packageId, templateName);

    this.activeContractData = {
      contractId,
    };
  }

  override async getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    const result: DamlTuple2<string[]> = await this.exerciseChoice(
      GET_PRICES_DISCLOSED_CHOICE,
      {
        caller: this.client.partyId,
        ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
        adapterCid: this.coreActiveContractData.contractId,
        featuredCid: this.featuredActiveContractData.contractId,
      },
      undefined,
      true,
      this.client,
      [this.featuredActiveContractData, this.coreActiveContractData]
    );

    return result._1.map(convertDecimalValue);
  }
}
