import { ContractParamsProvider } from "@redstone-finance/sdk";
import Decimal from "decimal.js";
import { CantonClient } from "../CantonClient";
import { DamlTuple2 } from "../utils";
import { CantonContractAdapter, ContractFilter } from "./CantonContractAdapter";

export const ICORE_TEMPLATE_NAME = `IRedStoneCore:IRedStoneCore`;
const GET_PRICES_CHOICE = "GetPrices";
const REDSTONE_DECIMALS = 8;

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
    const result: DamlTuple2<string[]> = await this.exerciseChoice(
      GET_PRICES_CHOICE,
      await CoreCantonContractAdapter.getPayloadArguments(paramsProvider),
      true
    );

    return result._1.map(CoreCantonContractAdapter.convertDecimalValue);
  }

  protected static convertDecimalValue(value: string) {
    const decimal = new Decimal(value).mul(10 ** REDSTONE_DECIMALS);

    return BigInt(decimal.toFixed());
  }

  protected static async getPayloadArguments(paramsProvider: ContractParamsProvider) {
    return {
      feedIds: paramsProvider.getArrayifiedFeedIds(),
      payloadHex: await paramsProvider.getPayloadHex(false),
    };
  }
}
