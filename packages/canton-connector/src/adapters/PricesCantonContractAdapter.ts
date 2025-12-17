import {
  ContractData,
  ContractParamsProvider,
  IExtendedPricesContractAdapter,
  LastRoundDetails,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { CantonClient } from "../CantonClient";
import { IADAPTER_TEMPLATE_NAME, INTERFACE_ID } from "../defs";
import { ContractFilter } from "./CantonContractAdapter";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";

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
    interfaceId = INTERFACE_ID,
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
    this.contractId ??= await this.fetchContractId();

    const result: ({ value: string; timestamp: string; writeTimestamp: string } | undefined)[] =
      await this.client.exerciseChoice({
        choice: READ_PRICE_DATA_CHOICE,
        contractId: this.contractId,
        choiceArgument: {
          feedIds: ContractParamsProvider.hexlifyFeedIds(feedIds).map(
            ContractParamsProvider.arrayifyFeedId
          ),
        },
        templateId: this.getInterfaceId(),
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
    this.contractId ??= await this.fetchContractId();

    const result: string[] = await this.client.exerciseChoice({
      choice: READ_PRICES_CHOICE,
      contractId: this.contractId,
      choiceArgument: {
        feedIds: paramsProvider.getArrayifiedFeedIds(),
      },
      templateId: this.getInterfaceId(),
    });

    return result.map(CoreCantonContractAdapter.convertDecimalValue);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    this.contractId ??= await this.fetchContractId(this.updateClient);

    const result: string = await this.updateClient.exerciseChoice(
      {
        choice: WRITE_PRICES_CHOICE,
        contractId: this.contractId,
        choiceArgument: {
          feedIds: paramsProvider.getArrayifiedFeedIds(),
          payloadHex: await paramsProvider.getPayloadHex(false),
        },
        templateId: this.getInterfaceId(),
      },
      true
    );

    this.contractId = result;

    return result;
  }
}
