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

  private async getFeaturedPricesParams(paramsProvider: ContractParamsProvider) {
    return {
      choice: GET_PRICES_FEATURED_CHOICE,
      argument: {
        ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
        featuredCid: this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT].contractId,
        caller: this.client.partyId,
      },
      offset: undefined,
      addCurrentTime: true,
      client: this.client,
      disclosedContractData: [this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
    };
  }

  override async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const { choice, argument, offset, addCurrentTime, client, disclosedContractData } =
      await this.getFeaturedPricesParams(paramsProvider);

    const result: DamlTuple2<string[]> = await this.exerciseChoice(
      choice,
      argument,
      offset,
      addCurrentTime,
      client,
      disclosedContractData
    );

    return result._1.map(convertDecimalValue);
  }

  protected async callGetPricesFromPayloadWithoutWaiting(paramsProvider: ContractParamsProvider) {
    const { choice, argument, offset, addCurrentTime, client, disclosedContractData } =
      await this.getFeaturedPricesParams(paramsProvider);

    return await this.exerciseChoiceWithoutWaiting(
      choice,
      argument,
      offset,
      addCurrentTime,
      client,
      disclosedContractData
    );
  }
}
