import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue } from "../conversions";
import { DamlTuple2 } from "../utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const DEFS_KEY_CORE_FEATURED = "core-featured";
export const DEFS_KEY_FEATURED_APP_RIGHT = "featured-app-right";

export const ICORE_FEATURED_TEMPLATE_NAME = `IRedStoneCoreFeatured:IRedStoneCoreFeatured`;
const GET_PRICES_FEATURED_CHOICE = "GetPricesFeatured";

export class CoreFeaturedCantonContractAdapter extends CoreCantonContractAdapter {
  constructor(
    client: CantonClient,
    adapterId = client.Defs[DEFS_KEY_CORE_FEATURED].coreId,
    interfaceId = client.Defs.featuredInterfaceId,
    templateName = ICORE_FEATURED_TEMPLATE_NAME
  ) {
    super(client, adapterId, interfaceId, templateName);
  }

  override async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const result: DamlTuple2<string[]> = await this.exerciseChoice(
      GET_PRICES_FEATURED_CHOICE,
      {
        ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
        featuredCid: this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT].contractId,
        caller: this.client.partyId,
      },
      undefined,
      true,
      this.client,
      [this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT]]
    );

    return result._1.map(convertDecimalValue);
  }
}
