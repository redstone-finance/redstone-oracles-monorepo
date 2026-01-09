import { ContractParamsProvider } from "@redstone-finance/sdk";
import Decimal from "decimal.js";
import { CantonClient } from "../CantonClient";
import { ICORE_TEMPLATE_NAME, INTERFACE_ID } from "../defs";
import { DamlTuple2 } from "../utils";
import { CantonContractAdapter, ContractFilter } from "./CantonContractAdapter";

const GET_PRICES_CHOICE = "GetPrices";
const REDSTONE_DECIMALS = 8;

export class CoreCantonContractAdapter extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    protected adapterId: string,
    interfaceId = INTERFACE_ID,
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
      await CoreCantonContractAdapter.getPayloadArgument(paramsProvider),
      true
    );

    return result._1.map(CoreCantonContractAdapter.convertDecimalValue);
  }

  protected static convertDecimalValue(value: string) {
    const decimal = new Decimal(value).mul(10 ** REDSTONE_DECIMALS);

    return BigInt(decimal.toFixed());
  }

  protected static async getPayloadArgument(paramsProvider: ContractParamsProvider) {
    return {
      feedIds: paramsProvider.getArrayifiedFeedIds(),
      payloadHex: await paramsProvider.getPayloadHex(false),
    };
  }
}
