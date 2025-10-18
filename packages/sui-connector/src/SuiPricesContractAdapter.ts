import { bcs } from "@mysten/bcs";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { TxDeliveryMan } from "@redstone-finance/multichain-kit";
import {
  ContractData,
  type ContractParamsProvider,
  getLastRoundDetails,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { SuiConfig } from "./config";
import { PriceAdapterConfig } from "./PriceAdapterConfig";
import { SuiContractUpdater } from "./SuiContractUpdater";
import { SuiPricesContractReader } from "./SuiPricesContractReader";
import { serialize, serializeAddresses, serializeSigners } from "./util";

export class SuiPricesContractAdapter implements IMultiFeedPricesContractAdapter {
  private readonly reader: SuiPricesContractReader;
  private readonly txDeliveryMan?: TxDeliveryMan;
  private readonly logger = loggerFactory("sui-prices-contract-adapter");

  private getPriceAdapterObjectDataContentMemoized = RedstoneCommon.memoize({
    functionToMemoize: (blockNumber?: number) =>
      this.reader.getPriceAdapterObjectDataContent(blockNumber),
    ttl: 1_000,
  });

  constructor(
    client: SuiClient,
    config: SuiConfig,
    private readonly contractUpdater?: SuiContractUpdater
  ) {
    this.reader = SuiPricesContractReader.createMultiReader(client, config.priceAdapterObjectId);
    this.txDeliveryMan = contractUpdater ? new TxDeliveryMan(contractUpdater, config) : undefined;
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
      arguments: [tx.object(adminCap), ...this.makeConfigArgs(config).map(tx.pure)],
    });
  }

  static updateConfig(tx: Transaction, config: SuiConfig & PriceAdapterConfig, adminCap: string) {
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

  private static makeConfigArgs(config: PriceAdapterConfig, asOptional = false) {
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
    return Promise.resolve(this.contractUpdater?.getSignerAddress());
  }

  async getUniqueSignerThreshold(blockNumber?: number): Promise<number> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    return priceAdapterDataContent.config.signer_count_threshold;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    blockNumber?: number
  ): Promise<bigint[]> {
    const contractData = await this.readContractData(paramsProvider.getDataFeedIds(), blockNumber);

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => getLastRoundDetails(contractData, feedId))
      .map((data) => data.lastValue);
  }

  async readLatestUpdateBlockTimestamp(feedId: string, blockNumber?: number): Promise<number> {
    return (await this.readAnyRoundDetails(feedId, blockNumber)).lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string, blockNumber?: number): Promise<number> {
    return (await this.readAnyRoundDetails(feedId, blockNumber)).lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[], blockNumber?: number): Promise<ContractData> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    const pricesTableId = priceAdapterDataContent.prices.id.id;
    if (!pricesTableId) {
      throw new Error("Prices table ID not found");
    }

    return _.pick(
      await this.reader.getContractDataFromPricesTable(pricesTableId, blockNumber),
      feedIds
    );
  }

  private async readAnyRoundDetails(feedId: string, blockNumber?: number) {
    return getLastRoundDetails(await this.readContractData([feedId], blockNumber), feedId);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    if (!this.txDeliveryMan) {
      throw new Error("Writer is not set");
    }

    const status = await this.txDeliveryMan.submitTransaction(paramsProvider);

    this.logger.info(`write-prices status: ${RedstoneCommon.stringify(status)}`);

    switch (status.success) {
      case true:
        return status.transactionHash;
      case false:
        throw AggregateError(status.errors);
    }
  }

  getPricesFromPayload(_paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
  }
}
