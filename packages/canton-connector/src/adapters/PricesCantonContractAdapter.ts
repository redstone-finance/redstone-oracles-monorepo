import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { CantonClient } from "../CantonClient";
import { convertDecimalValue, getArrayifiedFeedId } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { ActiveContractData } from "../utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;
export const WRITE_PRICES_CHOICE = "WritePrices";
const READ_PRICES_CHOICE = "ReadPrices";
const READ_PRICE_DATA_CHOICE = "ReadPriceData";
const GET_UNIQUE_SIGNER_THRESHOLD_CHOICE = "GetUniqueSignerThreshold";

export class PricesCantonContractAdapter
  extends CoreCantonContractAdapter
  implements WriteContractAdapter
{
  constructor(
    client: CantonClient,
    private updateClient: CantonClient,
    adapterId: string,
    private readonly additionalPillViewers?: string[],
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, adapterId, interfaceId, templateName);
  }

  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.adapterId) as ContractFilter;
  }

  getSignerAddress() {
    return Promise.resolve(this.updateClient.partyId);
  }

  async getUniqueSignerThreshold(offset?: number) {
    const result: number | undefined = await this.exerciseChoice(
      GET_UNIQUE_SIGNER_THRESHOLD_CHOICE,
      {},
      offset
    );

    if (result === undefined) {
      throw new Error("Failed to get unique signer threshold: result is undefined");
    }

    return result;
  }

  async readLatestUpdateBlockTimestamp(feedId: string, offset?: number) {
    const contractData = await this.readContractData([feedId], offset);

    return contractData[feedId].lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string, offset?: number) {
    const contractData = await this.readContractData([feedId], offset);

    return contractData[feedId].lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[], offset?: number): Promise<ContractData> {
    const result: ({ value: string; timestamp: string; writeTimestamp: string } | undefined)[] =
      await this.exerciseChoice(
        READ_PRICE_DATA_CHOICE,
        { feedIds: feedIds.map(getArrayifiedFeedId) },
        offset
      );

    const data = _.zip(feedIds, result).map(([feedId, r]) => [
      feedId!,
      RedstoneCommon.isDefined(r)
        ? ({
            lastDataPackageTimestampMS: Number(r.timestamp),
            lastBlockTimestampMS: Number(r.writeTimestamp),
            lastValue: convertDecimalValue(r.value),
          } as LastRoundDetails)
        : undefined,
    ]);

    return Object.fromEntries(data) as ContractData;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    offset?: number
  ): Promise<bigint[]> {
    const result: string[] = await this.exerciseChoice(
      READ_PRICES_CHOICE,
      { feedIds: paramsProvider.getArrayifiedFeedIds() },
      offset
    );

    return result.map(convertDecimalValue);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    try {
      const result: ActiveContractData | string = await this.exerciseChoice(
        WRITE_PRICES_CHOICE,
        {
          ...(await CoreCantonContractAdapter.getPayloadArguments(paramsProvider)),
          additionalPillViewers: this.additionalPillViewers,
        },
        undefined,
        true,
        this.updateClient,
        [this.updateClient.Defs[DEFS_KEY_FEATURED_APP_RIGHT]]
      );

      if (typeof result === "string") {
        this.activeContractData = {
          contractId: result,
          synchronizerId: this.activeContractData?.synchronizerId,
        };

        return result;
      } else {
        this.activeContractData = result;

        return result.contractId;
      }
    } catch (e) {
      this.activeContractData = undefined;

      throw e;
    }
  }
}
