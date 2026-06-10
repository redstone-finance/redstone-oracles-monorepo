import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../client/CantonClient";
import { convertDecimalValue } from "../utils/conversions";
import { ContractFilter } from "../utils/price-feed-utils";
import { DisclosedContractData } from "../utils/utils";
import { CantonContractAdapter, ExerciseChoiceOptions } from "./CantonContractAdapter";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const DEFS_KEY_FEATURED_APP_RIGHT = "featured-app-right";
export const CORE_CLIENT_TEMPLATE_NAME = `RedStoneCoreClient:RedStoneCoreClient`;
const GET_PRICES_DISCLOSED_CHOICE = "GetPricesDisclosed";

export class CoreClientCantonContractAdapter extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    private readonly partyId: string,
    contractId: string,
    packageId: string,
    private coreActiveContractData: DisclosedContractData = client.getDefs().core,
    private featuredActiveContractData: DisclosedContractData = client.getDefs()[
      DEFS_KEY_FEATURED_APP_RIGHT
    ],
    templateName = CORE_CLIENT_TEMPLATE_NAME
  ) {
    super(client, packageId, templateName);
    this.activeContractData = {
      contractId,
    };
  }
  protected override getContractFilter() {
    return ((createArgument: { contractId: string }) =>
      createArgument.contractId === this.activeContractData?.contractId) as ContractFilter;
  }

  private async getDisclosedPricesParams(
    paramsProvider: ContractParamsProvider
  ): Promise<{ argument: object; options: ExerciseChoiceOptions }> {
    return {
      argument: {
        ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
        adapterCid: this.coreActiveContractData.contractId,
      },
      options: {
        withCurrentTime: true,
        disclosedContractData: [this.featuredActiveContractData, this.coreActiveContractData],
        withCaller: true,
        withRetry: true,
      },
    };
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const { argument, options } = await this.getDisclosedPricesParams(paramsProvider);

    const { result } = await this.exerciseChoice(
      this.partyId,
      this.partyId,
      GET_PRICES_DISCLOSED_CHOICE,
      argument,
      options
    );

    return (result as { prices: string[] }).prices.map(convertDecimalValue);
  }
}
