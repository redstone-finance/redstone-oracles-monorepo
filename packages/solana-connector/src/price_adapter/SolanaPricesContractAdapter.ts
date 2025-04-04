import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import { PriceAdapterContract } from "../PriceAdapterContract";

export class SolanaPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  protected readonly logger = loggerFactory("solana-price-adapter");

  constructor(private contract: PriceAdapterContract) {}

  getSignerAddress() {
    const pk = this.contract.program.provider.publicKey;
    return pk
      ? Promise.resolve(pk.toString())
      : Promise.reject(new Error("Signer required"));
  }

  async getUniqueSignerThreshold(): Promise<number> {
    return await this.contract.getUniqueSignerThreshold();
  }

  async readLatestUpdateBlockTimestamp(
    feedId?: string
  ): Promise<number | undefined> {
    if (!feedId) {
      return undefined;
    }
    const priceData = await this.contract.getPriceData(feedId);

    return priceData.writeTimestamp?.toNumber();
  }

  getPricesFromPayload(_: ContractParamsProvider): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ) {
    const { payloads } = ContractParamsProvider.extractMissingValues(
      await paramsProvider.prepareSplitPayloads(),
      this.logger
    );

    return await this.contract.writePrices(payloads);
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    const feedIds = paramsProvider.getDataFeedIds();
    const promises = await Promise.all(
      feedIds.map((feedId) => this.contract.getPriceData(feedId))
    );
    return promises.map((priceData) => BigInt(toNumber(priceData.value)));
  }

  async readTimestampFromContract(feedId: string): Promise<number> {
    const priceData = await this.contract.getPriceData(feedId);

    return priceData.timestamp.toNumber();
  }

  async readContractData(feedIds: string[]): Promise<ContractData> {
    const promises = await Promise.allSettled(
      feedIds.map((feedId) => this.contract.getPriceData(feedId))
    );

    const values = promises
      .filter((result) => result.status === "fulfilled")
      .map((result) => [
        ContractParamsProvider.unhexlifyFeedId(result.value.feedId),
        {
          lastDataPackageTimestampMS: result.value.timestamp.toNumber(),
          lastBlockTimestampMS: result.value.writeTimestamp?.toNumber() ?? 0,
          lastValue: toNumber(result.value.value),
        },
      ]);

    return Object.fromEntries(values) as ContractData;
  }
}

function toNumber(values: number[]): number {
  let result = 0;
  for (const value of values) {
    result = result * 256 + value;
  }
  return result;
}
