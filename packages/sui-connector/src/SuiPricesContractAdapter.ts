import { bcs } from "@mysten/bcs";
import { SuiClient } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import {
  ContractData,
  type ContractParamsProvider,
  convertDataPackagesResponse,
  type DataPackagesResponse,
  extractSignedDataPackagesForFeedId,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumberish, utils } from "ethers";
import _ from "lodash";
import { version } from "../package.json";
import { SuiConfig } from "./config";
import { PriceAdapterConfig } from "./PriceAdapterConfig";
import { SuiContractAdapter } from "./SuiContractAdapter";
import { SuiTxDeliveryMan } from "./SuiTxDeliveryMan";
import { PriceAdapterDataContent, PriceDataContent } from "./types";
import {
  makeFeedIdBytes,
  serialize,
  serializeAddresses,
  serializeSigners,
  uint8ArrayToBcs,
} from "./util";

const DEFAULT_GAS_MULTIPLIER_BASE = 1.4;
const DEFAULT_MAX_TX_SEND_ATTEMPTS = 8;

export class SuiPricesContractAdapter
  extends SuiContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  constructor(
    client: SuiClient,
    private readonly config: SuiConfig,
    keypair?: Keypair,
    deliveryMan?: SuiTxDeliveryMan
  ) {
    super(
      client,
      keypair,
      deliveryMan ??
        (keypair ? new SuiTxDeliveryMan(client, keypair) : undefined)
    );
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

  async getUniqueSignerThreshold(): Promise<number> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContent();

    return priceAdapterDataContent.config.signer_count_threshold;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    const contractData = await this.readContractData(
      paramsProvider.getDataFeedIds()
    );

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => contractData[feedId].lastValue);
  }

  async readLatestUpdateBlockTimestamp(feedId: string): Promise<number> {
    return (await this.readAnyRoundDetails(feedId)).lastBlockTimestampMS;
  }

  async readTimestampFromContract(feedId: string): Promise<number> {
    return (await this.readAnyRoundDetails(feedId)).lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[]): Promise<ContractData> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContent();

    const pricesTableId = priceAdapterDataContent.prices.id.id;
    if (!pricesTableId) {
      throw new Error("Prices table ID not found");
    }

    return _.pick(
      await this.getContractDataFromPricesTable(pricesTableId),
      feedIds
    );
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string> {
    let iterationIndex = 0;
    const metadataTimestamp = Date.now();
    const tx = await this.prepareWritePricesTransaction(
      paramsProvider,
      metadataTimestamp
    );

    if (!this.deliveryMan) {
      throw new Error("Delivery man is not set");
    }

    return await this.deliveryMan.sendTransaction(tx, async () => {
      iterationIndex += 1;

      if (
        iterationIndex >=
        (this.config.maxTxSendAttempts ?? DEFAULT_MAX_TX_SEND_ATTEMPTS)
      ) {
        return;
      }

      return await this.prepareWritePricesTransaction(
        paramsProvider,
        metadataTimestamp,
        iterationIndex
      );
    });
  }

  private async prepareWritePricesTransaction(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number,
    iterationIndex = 0
  ) {
    const gasMultiplierBase =
      this.config.gasMultiplier ?? DEFAULT_GAS_MULTIPLIER_BASE;

    const tx = await this.prepareBaseTransaction(
      gasMultiplierBase ** iterationIndex,
      this.config.writePricesTxGasBudget
    );

    const dataPackagesResponse: DataPackagesResponse =
      await paramsProvider.requestDataPackages();

    const unsignedMetadata = this.getUnsignedMetadata(metadataTimestamp);

    paramsProvider.getDataFeedIds().forEach((feedId) => {
      const dataPackages = extractSignedDataPackagesForFeedId(
        dataPackagesResponse,
        feedId
      );
      const payload = convertDataPackagesResponse(
        { [feedId]: dataPackages },
        "string",
        unsignedMetadata
      );

      this.writePrice(tx, feedId, payload);
    });
    return tx;
  }

  private writePrice(tx: Transaction, feedId: string, payload: string) {
    tx.moveCall({
      target: `${this.config.packageId}::price_adapter::write_price`,
      arguments: [
        tx.object(this.config.priceAdapterObjectId),
        tx.pure(uint8ArrayToBcs(makeFeedIdBytes(feedId))),
        tx.pure(uint8ArrayToBcs(utils.arrayify("0x" + payload))),
        tx.object(SUI_CLOCK_OBJECT_ID), // Clock object ID
      ],
    });
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getPricesFromPayload(
    _paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    throw new Error("Pull model not supported");
  }

  private async readAnyRoundDetails(feedId: string) {
    return Object.values(await this.readContractData([feedId]))[0];
  }

  private async getPriceAdapterObjectDataContent() {
    const object = await this.client.getObject({
      id: this.config.priceAdapterObjectId,
      options: { showContent: true },
    });

    if (!object.data?.content) {
      throw new Error("Object not found or has no content");
    }

    return PriceAdapterDataContent.parse(object.data.content);
  }

  private async getContractDataFromPricesTable(pricesTableId: string) {
    const dynamicFields = await this.client.getDynamicFields({
      parentId: pricesTableId,
    });
    if (dynamicFields.data.length === 0) {
      throw new Error("Dynamic fields not found");
    }

    const ids = dynamicFields.data.map((field) => field.objectId);
    const result = await this.client.multiGetObjects({
      ids,
      options: { showContent: true },
    });

    const parsedResults = result.map(
      (response) => PriceDataContent.parse(response.data?.content).value
    );
    const contractData = parsedResults.map((data) => [
      utils.toUtf8String(data.feed_id).replace(/\0+$/, ""),
      {
        lastDataPackageTimestampMS: parseInt(data.timestamp),
        lastBlockTimestampMS: parseInt(data.write_timestamp),
        lastValue: BigInt(data.value),
      },
    ]);

    return Object.fromEntries(contractData) as ContractData;
  }

  private getUnsignedMetadata(metadataTimestamp: number): string {
    return `${metadataTimestamp}#${version}#data-packages-wrapper`;
  }
}
