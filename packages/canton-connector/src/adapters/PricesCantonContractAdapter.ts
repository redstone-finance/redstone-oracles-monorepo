import {
  ContractData,
  ContractParamsProvider,
  IExtendedPricesContractAdapter,
  LastRoundDetails,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { CantonClient } from "../CantonClient";
import { ActiveContractData } from "../utils";
import { ContractFilter } from "./CantonContractAdapter";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;
const WRITE_PRICES_CHOICE = "WritePrices";
const READ_PRICES_CHOICE = "ReadPrices";
const READ_PRICE_DATA_CHOICE = "ReadPriceData";
const UNIQUE_SIGNERS_THRESHOLD = 3; // temporary

export class PricesCantonContractAdapter
  extends CoreCantonContractAdapter
  implements IExtendedPricesContractAdapter
{
  constructor(
    client: CantonClient,
    private updateClient: CantonClient,
    adapterId: string,
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

  getUniqueSignerThreshold() {
    return Promise.resolve(UNIQUE_SIGNERS_THRESHOLD);
  }

  async readLatestUpdateBlockTimestamp(feedId: string) {
    const contractData = await this.readContractData([feedId]);

    return contractData[feedId].lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string) {
    const contractData = await this.readContractData([feedId]);

    return contractData[feedId].lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[]) {
    const result: ({ value: string; timestamp: string; writeTimestamp: string } | undefined)[] =
      await this.exerciseChoice(READ_PRICE_DATA_CHOICE, {
        feedIds: ContractParamsProvider.hexlifyFeedIds(feedIds).map(
          ContractParamsProvider.arrayifyFeedId
        ),
      });

    const data = _.zip(feedIds, result).map(([feedId, r]) => [
      feedId!,
      RedstoneCommon.isDefined(r)
        ? ({
            lastDataPackageTimestampMS: Number(r.timestamp),
            lastBlockTimestampMS: Number(r.writeTimestamp),
            lastValue: CoreCantonContractAdapter.convertDecimalValue(r.value),
          } as LastRoundDetails)
        : undefined,
    ]);

    return Object.fromEntries(data) as ContractData;
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    const result: string[] = await this.exerciseChoice(READ_PRICES_CHOICE, {
      feedIds: paramsProvider.getArrayifiedFeedIds(),
    });

    return result.map(CoreCantonContractAdapter.convertDecimalValue);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    const result: ActiveContractData = await this.exerciseChoice(
      WRITE_PRICES_CHOICE,
      await CoreCantonContractAdapter.getPayloadArguments(paramsProvider),
      true,
      this.updateClient
    );

    this.activeContractData = result;

    return result.contractId;
  }
}
