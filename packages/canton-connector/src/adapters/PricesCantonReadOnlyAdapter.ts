import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import {
  CantonFeedId,
  convertDecimalValue,
  decodeCantonFeedId,
  getCantonFeedId,
} from "../utils/conversions";
import { ContractFilter } from "../utils/price-feed-utils";
import { CantonContractAdapter } from "./CantonContractAdapter";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;

export class PricesCantonReadOnlyAdapter extends CantonContractAdapter implements ContractAdapter {
  private readonly coreAdapter: CoreCantonContractAdapter;

  constructor(
    client: CantonClient,
    protected readonly config: Pick<
      CantonContractAdapterConfig,
      "adapterId" | "viewerPartyId" | "uniqueSignerThreshold"
    >,
    interfaceId = client.getDefs().interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);

    this.coreAdapter = new CoreInsidePricesCantonContractAdapter(
      client,
      config.viewerPartyId,
      config.adapterId,
      interfaceId
    );
  }

  async getDataFeedIds(offset?: number) {
    const feedData = await this.readFeedData(offset);

    return feedData.map(([feedId]) => decodeCantonFeedId(feedId));
  }

  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.config.adapterId) as ContractFilter;
  }

  protected async readFeedData(offset?: number): Promise<DamlFeedData> {
    const { createArgument } = await this.fetchContractWithPayload<RedStoneAdapterPayload>(
      this.config.viewerPartyId,
      offset
    );

    return createArgument.feedData;
  }

  getUniqueSignerThreshold(_offset?: number) {
    return Promise.resolve(this.config.uniqueSignerThreshold);
  }

  async readContractData(
    feedIds: string[],
    offset?: number,
    _withDataFeedValues?: boolean
  ): Promise<ContractData> {
    const feedData = await this.readFeedData(offset);

    const data = feedIds.map((feedId) => {
      const priceData = newestPriceData(feedData, feedId);

      return [
        feedId,
        RedstoneCommon.isDefined(priceData)
          ? ({
              lastDataPackageTimestampMS: Number(priceData.timestamp),
              lastBlockTimestampMS: Number(priceData.writeTimestamp),
              lastValue: convertDecimalValue(priceData.value),
            } as LastRoundDetails)
          : undefined,
      ];
    });

    return Object.fromEntries(data) as ContractData;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    return await this.coreAdapter.getPricesFromPayload(paramsProvider);
  }
}

interface DamlPriceData {
  value: string;
  timestamp: string;
  writeTimestamp: string;
}

interface DamlPillRecord {
  priceData: DamlPriceData;
}

type DamlFeedData = [CantonFeedId, DamlPillRecord[]][];

interface RedStoneAdapterPayload {
  adapterId: string;
  owner: string;
  updaters: string[];
  viewers: string[];
  feedData: DamlFeedData;
  pillFactory: string | null;
}

function feedDataEntryByFeedId(
  feedData: DamlFeedData,
  feedId: string
): DamlPillRecord[] | undefined {
  const target = getCantonFeedId(feedId);

  const entry = feedData.find(
    ([key]) => key.length === target.length && key.every((byte, i) => byte === target[i])
  );

  return entry?.[1];
}

function newestPriceData(feedData: DamlFeedData, feedId: string): DamlPriceData | undefined {
  const records = feedDataEntryByFeedId(feedData, feedId);

  if (!records || records.length === 0) {
    return undefined;
  }

  return records[0].priceData;
}

class CoreInsidePricesCantonContractAdapter extends CoreCantonContractAdapter {
  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.adapterId) as ContractFilter;
  }
}
