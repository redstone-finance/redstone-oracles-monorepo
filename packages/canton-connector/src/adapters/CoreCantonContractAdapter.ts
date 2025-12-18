import { ContractParamsProvider } from "@redstone-finance/sdk";
import Decimal from "decimal.js";
import { CantonClient } from "../CantonClient";
import { ICORE_TEMPLATE_NAME, INTERFACE_ID } from "../defs";
import { Daml2Tuple } from "../utils";
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
    this.contractId ??= await this.fetchContractId();

    const result: Daml2Tuple<string[]> = await this.client.exerciseChoice(
      {
        choice: GET_PRICES_CHOICE,
        contractId: this.contractId,
        choiceArgument: {
          feedIds: paramsProvider.getArrayifiedFeedIds(),
          payloadHex: await paramsProvider.getPayloadHex(false),
        },
        templateId: this.getInterfaceId(),
      },
      true
    );

    return result._1.map(CoreCantonContractAdapter.convertDecimalValue);
  }

  protected static convertDecimalValue(value: string) {
    return BigInt(new Decimal(value).mul(10 ** REDSTONE_DECIMALS).toFixed());
  }
}
