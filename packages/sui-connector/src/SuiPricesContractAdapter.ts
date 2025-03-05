import { bcs } from "@mysten/bcs";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  ContractData,
  type ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import _ from "lodash";
import { SuiConfig } from "./config";
import { PriceAdapterConfig } from "./PriceAdapterConfig";
import { SuiPricesContractReader } from "./SuiPricesContractReader";
import { SuiPricesContractWriter } from "./SuiPricesContractWriter";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";
import { serialize, serializeAddresses, serializeSigners } from "./util";

export class SuiPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  private readonly reader: SuiPricesContractReader;
  private readonly writer?: SuiPricesContractWriter;
  private getPriceAdapterObjectDataContentMemoized = RedstoneCommon.memoize({
    functionToMemoize: (blockNumber?: number) =>
      this.reader.getPriceAdapterObjectDataContent(blockNumber),
    ttl: 1_000,
  });

  constructor(
    client: SuiClient,
    config: SuiConfig,
    deliveryMan?: SuiTxDeliveryMan
  ) {
    this.reader = SuiPricesContractReader.createMultiReader(
      client,
      config.priceAdapterObjectId
    );
    this.writer = deliveryMan
      ? new SuiPricesContractWriter(deliveryMan, config)
      : undefined;
  }

  static initialize(
    tx: Transaction,
    config: PriceAdapterConfig,
    packageId: string,
    adminCap: string
  ) {
    tx.setGasBudget(config.initializeTxGasBudget);
    tx.moveCall({
      target: `${packageId}::main::initialize_price_adapter`,
      arguments: [
        tx.object(adminCap),
        ...this.makeConfigArgs(config).map(tx.pure),
      ],
    });
  }

  static updateConfig(
    tx: Transaction,
    config: SuiConfig & PriceAdapterConfig,
    adminCap: string
  ) {
    tx.setGasBudget(config.initializeTxGasBudget);
    tx.moveCall({
      target: `${config.packageId}::price_adapter::update_config`,
      arguments: [
        tx.object(adminCap),
        tx.object(config.priceAdapterObjectId),
        ...this.makeConfigArgs(config, true).map(tx.pure),
      ],
    });
  }

  private static makeConfigArgs(
    config: PriceAdapterConfig,
    asOptional = false
  ) {
    return [
      serializeSigners(config.signers, asOptional),
      serialize(bcs.u8(), config.signerCountThreshold, asOptional),
      serialize(bcs.u64(), config.maxTimestampDelayMs, asOptional),
      serialize(bcs.u64(), config.maxTimestampAheadMs, asOptional),
      serializeAddresses(config.trustedUpdaters, asOptional),
      serialize(bcs.u64(), config.minIntervalBetweenUpdatesMs, asOptional),
    ];
  }

  getSignerAddress() {
    return Promise.resolve(this.writer?.getSignerAddress());
  }

  async getUniqueSignerThreshold(blockNumber?: number): Promise<number> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    return priceAdapterDataContent.config.signer_count_threshold;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    blockNumber?: number
  ): Promise<BigNumberish[]> {
    const contractData = await this.readContractData(
      paramsProvider.getDataFeedIds(),
      blockNumber
    );

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => contractData[feedId].lastValue);
  }

  async readLatestUpdateBlockTimestamp(
    feedId: string,
    blockNumber?: number
  ): Promise<number> {
    return (await this.readAnyRoundDetails(feedId, blockNumber))
      .lastBlockTimestampMS;
  }

  async readTimestampFromContract(
    feedId: string,
    blockNumber?: number
  ): Promise<number> {
    return (await this.readAnyRoundDetails(feedId, blockNumber))
      .lastDataPackageTimestampMS;
  }

  async readContractData(
    feedIds: string[],
    blockNumber?: number
  ): Promise<ContractData> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    const pricesTableId = priceAdapterDataContent.prices.id.id;
    if (!pricesTableId) {
      throw new Error("Prices table ID not found");
    }

    return _.pick(
      await this.reader.getContractDataFromPricesTable(
        pricesTableId,
        blockNumber
      ),
      feedIds
    );
  }

  private async readAnyRoundDetails(feedId: string, blockNumber?: number) {
    return Object.values(await this.readContractData([feedId], blockNumber))[0];
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string> {
    if (!this.writer) {
      throw new Error("Writer is not set");
    }

    return await this.writer.writePricesFromPayloadToContract(paramsProvider);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getPricesFromPayload(
    _paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }
}
