import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { ActiveContractData, DamlTuple2 } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const DEFS_KEY_FEATURED_APP_RIGHT = "featured-app-right";
export const CORE_CLIENT_TEMPLATE_NAME = `RedStoneCoreClient:RedStoneCoreClient`;
const GET_PRICES_DISCLOSED_CHOICE = "GetPricesDisclosed";

export class CoreClientCantonContractAdapter extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    contractId: string,
    packageId: string,
    private coreActiveContractData: Required<ActiveContractData> = client.Defs.core,
    private featuredActiveContractData: Required<ActiveContractData> = client.Defs[
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

  private async getDisclosedPricesParams(paramsProvider: ContractParamsProvider) {
    return {
      choice: GET_PRICES_DISCLOSED_CHOICE,
      argument: {
        ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
        adapterCid: this.coreActiveContractData.contractId,
      },
      offset: undefined,
      addCurrentTime: true,
      client: this.client,
      disclosedContractData: [this.featuredActiveContractData, this.coreActiveContractData],
    };
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const { choice, argument, offset, addCurrentTime, client, disclosedContractData } =
      await this.getDisclosedPricesParams(paramsProvider);

    const result: DamlTuple2<string[]> = await this.exerciseChoiceWithCaller(
      choice,
      argument,
      offset,
      addCurrentTime,
      client,
      disclosedContractData
    );

    return result._1.map(convertDecimalValue);
  }
}
