import {
  ContractData,
  ContractParamsProvider,
  getLastRoundDetails,
  IExtendedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { SolanaContractUpdater } from "../client/SolanaContractUpdater";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaPricesContractAdapter implements IExtendedPricesContractAdapter {
  protected readonly logger = loggerFactory("solana-price-adapter");

  constructor(
    private contract: PriceAdapterContract,
    private readonly updater?: SolanaContractUpdater
  ) {}

  getSignerAddress() {
    const pk = this.updater?.getPublicKey();
    return pk ? Promise.resolve(pk.toString()) : Promise.reject(new Error("Signer required"));
  }

  async getUniqueSignerThreshold(slot?: number): Promise<number> {
    return await this.contract.getUniqueSignerThreshold(slot);
  }

  async readLatestUpdateBlockTimestamp(
    feedId?: string,
    slot?: number
  ): Promise<number | undefined> {
    if (!feedId) {
      return undefined;
    }
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.writeTimestamp?.toNumber();
  }

  getPricesFromPayload(_: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    if (!this.updater) {
      throw new Error("Can't write prices, updater not set");
    }

    const res = await this.updater.writePrices(paramsProvider);

    return FP.unwrapSuccess(res).transactionHash;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    slot?: number
  ): Promise<bigint[]> {
    const contractData = await this.readContractData(paramsProvider.getDataFeedIds(), slot);

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => getLastRoundDetails(contractData, feedId))
      .map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, slot?: number): Promise<number> {
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.timestamp.toNumber() ?? 0;
  }

  async readContractData(feedIds: string[], slot?: number): Promise<ContractData> {
    const multipleResult = await this.contract.getMultiplePriceData(feedIds, slot);

    const values = multipleResult.filter(RedstoneCommon.isDefined).map((result) => [
      ContractParamsProvider.unhexlifyFeedId(result.feedId),
      {
        lastDataPackageTimestampMS: result.timestamp.toNumber(),
        lastBlockTimestampMS: result.writeTimestamp?.toNumber() ?? 0,
        lastValue: toNumber(result.value),
      },
    ]);

    return Object.fromEntries(values) as ContractData;
  }
}

export function toNumber(values: number[]): number {
  let result = 0;
  for (const value of values) {
    result = result * 256 + value;
  }
  return result;
}
