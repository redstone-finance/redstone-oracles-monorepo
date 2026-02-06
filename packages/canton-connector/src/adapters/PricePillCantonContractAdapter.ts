import {
  ContractParamsProvider,
  IPriceFeedContractAdapter,
  PriceAndTimestamp,
} from "@redstone-finance/sdk";
import { CantonClient, ContractFilter } from "../CantonClient";
import { getArrayifiedFeedId, REDSTONE_DECIMALS } from "../conversions";
import {
  createFeedIdFilter,
  findNewestContract,
  IPRICE_FEED_ENTRY_TEMPLATE_NAME,
  parsePriceData,
  PriceData,
  READ_DATA_CHOICE,
  READ_DESCRIPTION_CHOICE,
  READ_FEED_ID_CHOICE,
} from "../price-feed-utils";
import { makeActiveContractData } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export class PricePillCantonContractAdapter
  extends CantonContractAdapter
  implements IPriceFeedContractAdapter
{
  private readonly arrayifiedFeedId: number[];

  constructor(
    client: CantonClient,
    protected feedId: string,
    interfaceId = client.Defs.interfaceId,
    templateName = IPRICE_FEED_ENTRY_TEMPLATE_NAME
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
    const result: PriceData = await this.exerciseChoice(READ_DATA_CHOICE, {}, offset);
    return parsePriceData(result);
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

    const newest = findNewestContract(createdEvents);
    if (!newest) {
      throw new Error("Didn't find any contract");
    }

    return makeActiveContractData(newest);
  }

  protected override getContractFilter(): ContractFilter {
    return createFeedIdFilter([this.arrayifiedFeedId]);
  }
}
