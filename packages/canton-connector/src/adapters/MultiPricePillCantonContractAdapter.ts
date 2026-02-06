import { LastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient, ContractFilter } from "../CantonClient";
import {
  buildArrayifiedFeedIds,
  createFeedIdFilter,
  findNewestContract,
  groupEventsByFeedId,
  IPRICE_FEED_ENTRY_TEMPLATE_NAME,
  parsePriceData,
  PriceData,
  READ_DATA_CHOICE,
} from "../price-feed-utils";
import { makeActiveContractData } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export class MultiPricePillCantonContractAdapter extends CantonContractAdapter {
  private readonly arrayifiedFeedIds: Map<string, number[]>;

  constructor(
    client: CantonClient,
    private readonly feedIds: string[],
    interfaceId = client.Defs.interfaceId,
    templateName = IPRICE_FEED_ENTRY_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
    this.arrayifiedFeedIds = buildArrayifiedFeedIds(feedIds);
  }

  async batchReadData(blockNumber?: number): Promise<Record<string, LastRoundDetails>> {
    const contractData = await this.fetchAllContractData(blockNumber);

    const choices = contractData.map(({ contractId }) => ({
      choice: READ_DATA_CHOICE,
      argument: {},
      contractId,
    }));

    const resultsByContractId = await this.exerciseChoices<PriceData>(
      choices,
      this.getInterfaceId(),
      false,
      this.client
    );

    return Object.fromEntries(
      contractData
        .map(({ feedId, contractId }) => {
          const result = resultsByContractId[contractId];

          return [feedId, parsePriceData(result)] as const;
        })
        .filter(RedstoneCommon.isDefined)
    );
  }

  private async fetchAllContractData(blockNumber?: number) {
    const createdEvents = await this.client.getCreateContractEvents(
      this.getInterfaceId(),
      this.getContractFilter(),
      blockNumber
    );

    const eventsByFeedId = groupEventsByFeedId(createdEvents, this.feedIds, this.arrayifiedFeedIds);

    return this.feedIds
      .map((feedId) => {
        const newest = findNewestContract(eventsByFeedId[feedId] ?? []);
        if (!newest) {
          return undefined;
        }

        return {
          feedId,
          contractId: makeActiveContractData(newest).contractId,
        };
      })
      .filter(RedstoneCommon.isDefined);
  }

  protected override getContractFilter(): ContractFilter {
    return createFeedIdFilter([...this.arrayifiedFeedIds.values()]);
  }
}
