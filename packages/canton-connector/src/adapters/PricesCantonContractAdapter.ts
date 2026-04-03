import {
  ContractAdapter,
  TxDeliveryMan,
  WriteContractAdapter,
} from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { CantonChoiceExerciser, CantonContractUpdater } from "../CantonContractUpdater";
import { convertDecimalValue, getArrayifiedFeedId } from "../conversions";
import { ContractFilter } from "../price-feed-utils";
import { CoreCantonContractAdapter } from "./CoreCantonContractAdapter";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";

export const IADAPTER_TEMPLATE_NAME = `IRedStoneAdapter:IRedStoneAdapter`;
export const WRITE_PRICES_CHOICE = "WritePrices";

const DEFAULT_UNIQUE_SIGNER_THRESHOLD = 3;

const TX_MAN_CONFIG = {
  maxTxSendAttempts: 5,
  expectedTxDeliveryTimeInMs: RedstoneCommon.secsToMs(15),
};

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

export class PricesCantonReadOnlyAdapter
  extends CoreCantonContractAdapter
  implements ContractAdapter
{
  constructor(
    client: CantonClient,
    protected readonly viewerPartyId: string,
    adapterId: string,
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME,
    protected readonly uniqueSignerThreshold: number = DEFAULT_UNIQUE_SIGNER_THRESHOLD
  ) {
    super(client, viewerPartyId, adapterId, interfaceId, templateName);
  }

  protected override getContractFilter() {
    return ((createArgument: { adapterId: string }) =>
      createArgument.adapterId === this.adapterId) as ContractFilter;
  }

  protected async readFeedData(offset?: number): Promise<DamlFeedData> {
    const { createArgument } = await this.fetchContractWithPayload<RedStoneAdapterPayload>(
      this.viewerPartyId,
      offset
    );

    return createArgument.feedData;
  }

  async getUniqueSignerThreshold(_offset?: number) {
    return await Promise.resolve(this.uniqueSignerThreshold);
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

export class PricesCantonContractAdapter
  extends PricesCantonReadOnlyAdapter
  implements WriteContractAdapter, CantonChoiceExerciser
{
  private readonly txDeliveryMan: TxDeliveryMan;
  private readonly contractUpdater: CantonContractUpdater;

  constructor(
    client: CantonClient,
    viewerPartyId: string,
    updaterPartyId: string,
    adapterId: string,
    private readonly additionalPillViewers?: string[],
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME,
    uniqueSignerThreshold: number = DEFAULT_UNIQUE_SIGNER_THRESHOLD
  ) {
    super(client, viewerPartyId, adapterId, interfaceId, templateName, uniqueSignerThreshold);

    this.txDeliveryMan = new TxDeliveryMan(TX_MAN_CONFIG);
    this.contractUpdater = new CantonContractUpdater(this, updaterPartyId);
  }

  getSignerAddress() {
    return Promise.resolve(this.contractUpdater.getSignerAddress());
  }

  exerciseWriteChoice<Res, Arg extends object>(actAs: string, argument: Arg): Promise<Res> {
    return this.exerciseChoice(
      this.viewerPartyId,
      actAs,
      WRITE_PRICES_CHOICE,
      {
        ...argument,
        additionalPillViewers: this.additionalPillViewers,
      },
      {
        withCurrentTime: true,
        disclosedContractData: [this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
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

  getRemainingTraffic(): Promise<number> {
    return this.client.getRemainingTraffic();
  }
}
