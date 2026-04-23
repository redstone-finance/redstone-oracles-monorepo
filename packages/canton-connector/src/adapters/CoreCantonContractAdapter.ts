import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../client/CantonClient";
import { convertDecimalValue } from "../utils/conversions";
import { ContractFilter } from "../utils/price-feed-utils";
import { DamlTuple2 } from "../utils/utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export const ICORE_TEMPLATE_NAME = `IRedStoneCore:IRedStoneCore`;
const GET_PRICES_CHOICE = "GetPrices";

export class CoreCantonContractAdapter extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    private readonly actAs: string,
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
    const { result } = await this.exerciseChoice(
      this.actAs,
      this.actAs,
      GET_PRICES_CHOICE,
      await CoreCantonContractAdapter.getPayloadArguments(paramsProvider),
      { withCurrentTime: true, withCaller: true, withRetry: true }
    );

    return (result as DamlTuple2<string[]>)._1.map(convertDecimalValue);
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
