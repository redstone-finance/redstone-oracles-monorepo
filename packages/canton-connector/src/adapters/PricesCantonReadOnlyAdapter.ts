import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue, getArrayifiedFeedId } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;

export class PricesCantonReadOnlyAdapter
  extends CoreCantonContractAdapter
  implements ContractAdapter
{
  constructor(
    client: CantonClient,
    protected readonly config: Pick<
      CantonContractAdapterConfig,
      "adapterId" | "viewerPartyId" | "uniqueSignerThreshold"
    >,
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, config.viewerPartyId, config.adapterId, interfaceId, templateName);
  }

  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.adapterId) as ContractFilter;
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

  async readLatestUpdateBlockTimestamp(feedId: string, offset?: number) {
    const contractData = await this.readContractData([feedId], offset);

    return contractData[feedId].lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string, offset?: number) {
    const contractData = await this.readContractData([feedId], offset);

    return contractData[feedId].lastDataPackageTimestampMS;
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

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    offset?: number
  ): Promise<bigint[]> {
    const feedData = await this.readFeedData(offset);

    return paramsProvider.getDataFeedIds().map((feedId) => {
      const priceData = newestPriceData(feedData, feedId);

      if (!RedstoneCommon.isDefined(priceData)) {
        throw new Error(`Value not found for ${feedId}`);
      }

      return convertDecimalValue(priceData.value);
    });
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

type DamlFeedData = [string[], DamlPillRecord[]][];

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
  const target = getArrayifiedFeedId(feedId);

  const entry = feedData.find(
    ([key]) => key.length === target.length && key.every((byte, i) => Number(byte) === target[i])
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
