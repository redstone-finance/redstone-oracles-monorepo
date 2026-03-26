import { TxDeliveryMan, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { CantonClient } from "../CantonClient";
import { CantonContractUpdater } from "../CantonContractUpdater";
import { convertDecimalValue, getArrayifiedFeedId } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;
export const WRITE_PRICES_CHOICE = "WritePrices";
const READ_PRICES_CHOICE = "ReadPrices";
const READ_PRICE_DATA_CHOICE = "ReadPriceData";
const GET_UNIQUE_SIGNER_THRESHOLD_CHOICE = "GetUniqueSignerThreshold";

const TX_MAN_CONFIG = {
  maxTxSendAttempts: 5,
  expectedTxDeliveryTimeInMs: RedstoneCommon.secsToMs(15),
};

export class PricesCantonContractAdapter
  extends CoreCantonContractAdapter
  implements WriteContractAdapter
{
  private readonly txDeliveryMan: TxDeliveryMan;
  private readonly contractUpdater: CantonContractUpdater;

  constructor(
    client: CantonClient,
    updateClient: CantonClient,
    adapterId: string,
    private readonly additionalPillViewers?: string[],
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, adapterId, interfaceId, templateName);
    this.txDeliveryMan = new TxDeliveryMan(TX_MAN_CONFIG);
    this.contractUpdater = new CantonContractUpdater(this, updateClient);
  }

  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.adapterId) as ContractFilter;
  }

  getSignerAddress() {
    return Promise.resolve(this.contractUpdater.getSignerAddress());
  }

  async getUniqueSignerThreshold(offset?: number) {
    const result: number | undefined = await this.exerciseChoice(
      GET_UNIQUE_SIGNER_THRESHOLD_CHOICE,
      {},
      { offset, withCaller: true, withRetry: true }
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
        { offset, withCaller: true, withRetry: true }
      );

    if (result.length !== feedIds.length) {
      throw new Error(
        `ReadPriceData result length mismatch: expected ${feedIds.length}, got ${result.length}`
      );
    }

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
      { offset, withCaller: true, withRetry: true }
    );

    return result.map(convertDecimalValue);
  }

  exerciseWriteChoice<Res, Arg extends object>(
    updateClient: CantonClient,
    argument: Arg
  ): Promise<Res> {
    return this.exerciseChoice(
      WRITE_PRICES_CHOICE,
      {
        ...argument,
        additionalPillViewers: this.additionalPillViewers,
      },
      {
        withCurrentTime: true,
        client: updateClient,
        disclosedContractData: [updateClient.Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
        withCaller: true,
      }
    );
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    try {
      const result = await this.txDeliveryMan.updateContract(this.contractUpdater, paramsProvider);

      const contractId = FP.unwrapSuccess(result).transactionHash;

      this.activeContractData = {
        contractId,
        synchronizerId: this.activeContractData?.synchronizerId,
      };

      return contractId;
    } catch (e) {
      this.activeContractData = undefined;
      throw e;
    }
  }

  onError() {
    this.activeContractData = undefined;
  }
}
