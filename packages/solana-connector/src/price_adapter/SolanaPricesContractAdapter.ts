import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import { SolanaTxDeliveryMan } from "../SolanaTxDeliveryMan";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  protected readonly logger = loggerFactory("solana-price-adapter");

  constructor(
    private contract: PriceAdapterContract,
    private readonly txDeliveryMan?: SolanaTxDeliveryMan
  ) {}

  getSignerAddress() {
    const pk = this.contract.program.provider.publicKey;
    return pk
      ? Promise.resolve(pk.toString())
      : Promise.reject(new Error("Signer required"));
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

    return priceData.writeTimestamp?.toNumber();
  }

  getPricesFromPayload(_: ContractParamsProvider): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ) {
    if (!this.txDeliveryMan) {
      throw new Error("Can't write prices, TxDeliveryMan not set");
    }

    const metadataTimestamp = Date.now();

    const txSignatures = await this.txDeliveryMan.sendTransactions(
      paramsProvider.getDataFeedIds(),
      (feedIds) => this.retryFetch(paramsProvider, feedIds, metadataTimestamp)
    );

    this.logger.log(
      `FINISHED ${txSignatures.length} transaction${RedstoneCommon.getS(txSignatures.length)}: [${txSignatures.toString()}]`
    );
    return txSignatures[txSignatures.length - 1];
  }

  private async retryFetch(
    paramsProvider: ContractParamsProvider,
    feedIds: string[],
    metadataTimestamp: number
  ) {
    this.logger.debug(`Fetching payloads for [${feedIds.toString()}].`);
    const provider = paramsProvider.copyForFeedIds(feedIds);

    const { payloads } = ContractParamsProvider.extractMissingValues(
      await provider.prepareSplitPayloads({
        metadataTimestamp,
        withUnsignedMetadata: true,
      }),
      this.logger
    );

    return await Promise.all(
      Object.entries(payloads).map(async ([feedId, payload]) => ({
        instruction: await this.contract.writePriceTx(
          this.txDeliveryMan!.getPublicKey(),
          feedId,
          payload
        ),
        id: feedId,
      }))
    );
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    slot?: number
  ): Promise<BigNumberish[]> {
    const feedIds = paramsProvider.getDataFeedIds();
    const promises = await Promise.all(
      feedIds.map((feedId) => this.contract.getPriceData(feedId, slot))
    );
    return promises.map((priceData) => BigInt(toNumber(priceData.value)));
  }

  async readTimestampFromContract(
    feedId: string,
    slot?: number
  ): Promise<number> {
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData.timestamp.toNumber();
  }

  async readContractData(
    feedIds: string[],
    slot?: number
  ): Promise<ContractData> {
    const promises = await Promise.allSettled(
      feedIds.map((feedId) => this.contract.getPriceData(feedId, slot))
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

export function toNumber(values: number[]): number {
  let result = 0;
  for (const value of values) {
    result = result * 256 + value;
  }
  return result;
}
