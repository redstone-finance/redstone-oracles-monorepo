import {
  ContractData,
  ContractParamsProvider,
  getLastRoundDetails,
  IExtendedPricesContractAdapter,
  SplitPayloads,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PublicKey } from "@solana/web3.js";
import _ from "lodash";
import { SolanaTxDeliveryMan } from "../client/SolanaTxDeliveryMan";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaPricesContractAdapter implements IExtendedPricesContractAdapter {
  protected readonly logger = loggerFactory("solana-price-adapter");

  constructor(
    private contract: PriceAdapterContract,
    private readonly txDeliveryMan?: SolanaTxDeliveryMan
  ) {}

  getSignerAddress() {
    const pk = this.txDeliveryMan?.getPublicKey();
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
    if (!this.txDeliveryMan) {
      throw new Error("Can't write prices, TxDeliveryMan not set");
    }

    const metadataTimestamp = Date.now();

    const txSignatures = await this.txDeliveryMan.sendTransactions(
      paramsProvider.getDataFeedIds(),
      (feedIds) =>
        this.fetchTransactionInstructionsWithData(paramsProvider, feedIds, metadataTimestamp)
    );

    this.logger.log(
      `FINISHED ${txSignatures.length} transaction${RedstoneCommon.getS(txSignatures.length)}: [${txSignatures.toString()}]`
    );

    return txSignatures[txSignatures.length - 1];
  }

  private async fetchTransactionInstructionsWithData(
    paramsProvider: ContractParamsProvider,
    feedIds: string[],
    metadataTimestamp: number
  ) {
    if (!this.txDeliveryMan) {
      throw new Error("Can't write prices, TxDeliveryMan not set");
    }

    this.logger.debug(`Fetching payloads for [${feedIds.toString()}].`);
    const provider = paramsProvider.copyWithOverriddenFeedIds(feedIds);

    const { payloads } = ContractParamsProvider.extractMissingValues(
      await provider.prepareSplitPayloads({
        metadataTimestamp,
        withUnsignedMetadata: true,
      }),
      this.logger
    );

    const publicKey = this.txDeliveryMan.getPublicKey();
    return await this.makeTransactionInstructions(payloads, publicKey, feedIds);
  }

  private async makeTransactionInstructions(
    payloads: SplitPayloads<string>,
    publicKey: PublicKey,
    feedIds: string[]
  ) {
    const payloadEntries = Object.entries(payloads);

    const instructionSettledResults = await Promise.allSettled(
      payloadEntries.map(([feedId, payload]) =>
        this.contract.writePriceTx(publicKey, feedId, payload)
      )
    );

    const transactionInstructions = _.zip(payloadEntries, instructionSettledResults)
      .map(([payloadEntry, settledPromise]) =>
        settledPromise?.status === "fulfilled" && payloadEntry?.length
          ? {
              instruction: settledPromise.value,
              id: payloadEntry[0],
            }
          : undefined
      )
      .filter((i) => i !== undefined);

    if (transactionInstructions.length !== feedIds.length) {
      this.logger.error(
        `Failed to write ${feedIds.length - transactionInstructions.length} prices to contract.`
      );
    }

    return transactionInstructions;
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
