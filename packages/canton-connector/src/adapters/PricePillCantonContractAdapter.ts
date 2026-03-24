import {
  ContractParamsProvider,
  IPriceFeedContractAdapter,
  PriceAndTimestamp,
} from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { getArrayifiedFeedId, REDSTONE_DECIMALS } from "../conversions";
import {
  ContractFilter,
  CreatedArgumentCallback,
  createFeedIdFilter,
  IPRICE_PILL_TEMPLATE_NAME,
  parsePriceData,
  PriceData,
  READ_DATA_CHOICE,
  READ_DESCRIPTION_CHOICE,
  READ_FEED_ID_CHOICE,
} from "../price-feed-utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export class PricePillCantonContractAdapter
  extends CantonContractAdapter
  implements IPriceFeedContractAdapter
{
  private readonly arrayifiedFeedId: number[];

  constructor(
    client: CantonClient,
    protected adapterId: string,
    protected feedId: string,
    interfaceId = client.Defs.pricePillInterfaceId,
    templateName = IPRICE_PILL_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);

    this.arrayifiedFeedId = getArrayifiedFeedId(feedId);
  }

  async getPriceAndTimestamp(offset?: number): Promise<PriceAndTimestamp> {
    const result = await this.readData(offset);
    return {
      value: result.lastValue,
      timestamp: result.lastDataPackageTimestampMS,
    };
  }

  async readData(offset?: number) {
    const result: PriceData = await this.exerciseChoiceWithCaller(READ_DATA_CHOICE, {}, offset);

    return parsePriceData(result);
  }

  decimals(_offset?: number) {
    return Promise.resolve(REDSTONE_DECIMALS);
  }

  async getDescription(offset?: number) {
    return await this.exerciseChoiceWithCaller<string>(READ_DESCRIPTION_CHOICE, {}, offset);
  }

  async getDataFeedId(offset?: number) {
    const feedId: string[] = await this.exerciseChoiceWithCaller(READ_FEED_ID_CHOICE, {}, offset);

    return ContractParamsProvider.unhexlifyFeedId(feedId.map(Number));
  }

  override async fetchContractData(offset?: number, client = this.client) {
    return await client.getMostActiveContractData(
      this.getInterfaceId(),
      this.getContractFilter(),
      offset,
      ((createArgument: { priceData?: PriceData }) =>
        -Number(createArgument.priceData?.timestamp ?? 0)) as CreatedArgumentCallback // newest first
    );
  }

  protected override getContractFilter(): ContractFilter {
    return createFeedIdFilter([this.arrayifiedFeedId], this.adapterId);
  }
}
