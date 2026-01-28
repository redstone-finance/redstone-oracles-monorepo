import {
  ContractParamsProvider,
  IPriceFeedContractAdapter,
  PriceAndTimestamp,
} from "@redstone-finance/sdk";
import _ from "lodash";
import { CantonClient, ContractFilter } from "../CantonClient";
import { convertDecimalValue, getArrayifiedFeedId, REDSTONE_DECIMALS } from "../conversions";
import { makeActiveContractData } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export const IPRICE_FEED_ENTRY_TEMPLATE_NAME = `IRedStonePriceFeedEntry:IRedStonePriceFeedEntry`;
const READ_DATA_CHOICE = "ReadData";
const READ_FEED_ID_CHOICE = "ReadFeedId";
const READ_DESCRIPTION_CHOICE = "ReadDescription";

type PriceData = {
  value: string;
  timestamp: string;
  writeTimestamp: string;
};

export class PriceFeedEntryCantonContractAdapter
  extends CantonContractAdapter
  implements IPriceFeedContractAdapter
{
  constructor(
    client: CantonClient,
    protected feedId: string,
    interfaceId = client.Defs.interfaceId,
    templateName = IPRICE_FEED_ENTRY_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
  }

  async getPriceAndTimestamp(offset?: number): Promise<PriceAndTimestamp> {
    const result: PriceData = await this.exerciseChoice(READ_DATA_CHOICE, {}, offset);

    return {
      value: convertDecimalValue(result.value),
      timestamp: Number.parseInt(result.timestamp),
    };
  }

  decimals(_offset?: number) {
    return Promise.resolve(REDSTONE_DECIMALS);
  }

  async getDescription(offset?: number) {
    return await this.exerciseChoice<string>(READ_DESCRIPTION_CHOICE, {}, offset);
  }

  async getDataFeedId(offset?: number) {
    const feedId: string[] = await this.exerciseChoice(READ_FEED_ID_CHOICE, {}, offset);

    return ContractParamsProvider.unhexlifyFeedId(feedId.map(Number));
  }

  override async fetchContractData(offset?: number, client = this.client) {
    const createdEvents = await client.getCreateContractEvents(
      this.getInterfaceId(),
      this.getContractFilter(),
      offset
    );

    if (!createdEvents.length) {
      throw new Error("Didn't find any contract");
    }

    _.sortBy(createdEvents, (event) => Number((event.createArgument as PriceData).timestamp));

    const newest = createdEvents.at(-1)!;

    return makeActiveContractData(newest);
  }

  protected override getContractFilter(): ContractFilter {
    const arrayifiedFeedId = getArrayifiedFeedId(this.feedId);

    return ((createArgument: { feedId: string[]; priceData: PriceData }) =>
      _.isEqual(createArgument.feedId.map(Number), arrayifiedFeedId)) as ContractFilter;
  }
}
