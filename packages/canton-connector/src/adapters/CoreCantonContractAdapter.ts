import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { DamlTuple2 } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export const ICORE_TEMPLATE_NAME = `IRedStoneCore:IRedStoneCore`;
const GET_PRICES_CHOICE = "GetPrices";

export class CoreCantonContractAdapter extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    protected adapterId = client.Defs.core.coreId,
    interfaceId = client.Defs.interfaceId,
    templateName = ICORE_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
  }

  protected override getContractFilter() {
    return ((createArgument: { coreId: string }) =>
      createArgument.coreId === this.adapterId) as ContractFilter;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const result: DamlTuple2<string[]> = await this.exerciseChoiceWithCaller(
      GET_PRICES_CHOICE,
      await CoreCantonContractAdapter.getPayloadArguments(paramsProvider),
      undefined,
      true
    );

    return result._1.map(convertDecimalValue);
  }

  public static async getPayloadArguments(paramsProvider: ContractParamsProvider) {
    return {
      feedIds: paramsProvider.getArrayifiedFeedIds(),
      payloadHex: await paramsProvider.getPayloadHex(false, {
        withUnsignedMetadata: true,
        metadataTimestamp: Date.now(),
        componentName: "canton-connector",
      }),
    };
  }
}
