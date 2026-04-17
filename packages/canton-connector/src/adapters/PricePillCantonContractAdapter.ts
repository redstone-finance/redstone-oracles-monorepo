import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import { getArrayifiedFeedId, REDSTONE_DECIMALS } from "../conversions";
import {
  ContractFilter,
  CreatedArgumentCallback,
  createFeedIdFilter,
  IPRICE_PILL_TEMPLATE_NAME,
  parsePriceData,
  PriceData,
} from "../price-feed-utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

interface PricePillView {
  adapterId: string;
  feedId: string[];
  priceData: PriceData;
  stalenessMs: string;
}

export class PricePillCantonContractAdapter
  extends CantonContractAdapter
  implements PriceFeedAdapter
{
  private readonly arrayifiedFeedId: number[];

  constructor(
    client: CantonClient,
    private readonly partyId: string,
    protected adapterId: string,
    protected feedId: string,
    interfaceId = client.Defs.pricePillInterfaceId,
    templateName = IPRICE_PILL_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
    this.arrayifiedFeedId = getArrayifiedFeedId(feedId);
  }

  async getPriceAndTimestamp(offset?: number) {
    const result = await this.readData(offset);

    return {
      value: result.lastValue,
      timestamp: result.lastDataPackageTimestampMS,
    };
  }

  async readData(offset?: number) {
    const { priceData } = await this.readView(offset);

    return parsePriceData(priceData);
  }

  getDecimals(_offset?: number) {
    return Promise.resolve(REDSTONE_DECIMALS);
  }

  async getDescription(offset?: number) {
    const view = await this.readView(offset);
    const timestamp = view.priceData.timestamp;

    return `RedStone Price Pill of ${JSON.stringify(view.feedId)}, created by ${view.adapterId}; ${timestamp} valid to ${Number(timestamp) + Number(view.stalenessMs)}`;
  }

  async getDataFeedId(offset?: number) {
    const { feedId } = await this.readView(offset);

    return ContractParamsProvider.unhexlifyFeedId(feedId.map(Number));
  }

  override async fetchContractData(actAs: string, offset?: number, client = this.client) {
    return await client.getMostActiveContractData(
      actAs,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(),
      offset,
      PricePillCantonContractAdapter.newestPillSorter()
    );
  }

  protected override getContractFilter(): ContractFilter {
    return createFeedIdFilter([this.arrayifiedFeedId], this.adapterId);
  }

  private async readView(offset?: number): Promise<PricePillView> {
    const { createArgument } = await this.client.getMostActiveContractWithPayload<PricePillView>(
      this.partyId,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(),
      offset,
      PricePillCantonContractAdapter.newestPillSorter()
    );

    return createArgument;
  }

  private static newestPillSorter() {
    return ((createArgument: { priceData?: PriceData }) =>
      -Number(createArgument.priceData?.timestamp ?? 0)) as CreatedArgumentCallback;
  }
}
