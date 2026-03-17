import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import {
  ContractAdapter,
  TxDeliveryMan,
  WriteContractAdapter,
} from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, getLastRoundDetails } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { SuiConfig } from "./config";
import { SuiClient } from "./SuiClient";
import { SuiContractUpdater } from "./SuiContractUpdater";
import { SuiPricesContractReader } from "./SuiPricesContractReader";

export class SuiContractAdapter implements ContractAdapter {
  private readonly reader: SuiPricesContractReader;

  private getPriceAdapterObjectDataContentMemoized = RedstoneCommon.memoize({
    functionToMemoize: (blockNumber?: number) =>
      this.reader.getPriceAdapterObjectDataContent(blockNumber),
    ttl: 1_000,
  });

  constructor(
    protected readonly client: SuiClient,
    config: SuiConfig
  ) {
    this.reader = SuiPricesContractReader.createMultiReader(client, config.priceAdapterObjectId);
  }

  async readContractData(feedIds: string[], blockNumber?: number): Promise<ContractData> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    const pricesTableId = priceAdapterDataContent.prices.id;
    if (!pricesTableId) {
      throw new Error("Prices table ID not found");
    }

    return _.pick(
      await this.reader.getContractDataFromPricesTable(pricesTableId, blockNumber),
      feedIds
    );
  }

  async getUniqueSignerThreshold(blockNumber?: number): Promise<number> {
    const priceAdapterDataContent =
      await this.getPriceAdapterObjectDataContentMemoized(blockNumber);

    return priceAdapterDataContent.config.signer_count_threshold;
  }

  getPricesFromPayload(_paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
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

  private async readAnyRoundDetails(feedId: string, blockNumber?: number) {
    return getLastRoundDetails(await this.readContractData([feedId], blockNumber), feedId);
  }
}

export class SuiWriteContractAdapter extends SuiContractAdapter implements WriteContractAdapter {
  static contractUpdaterCache: { [p: string]: SuiContractUpdater | undefined } = {};

  private readonly txDeliveryMan: TxDeliveryMan;
  private readonly contractUpdater: SuiContractUpdater;
  private readonly logger = loggerFactory("sui-prices-contract-adapter");

  constructor(client: SuiClient, keypair: Keypair, config: SuiConfig) {
    super(client, config);

    this.txDeliveryMan = new TxDeliveryMan(config);
    this.contractUpdater = SuiWriteContractAdapter.getContractUpdater(keypair, client, config);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    const result = await this.txDeliveryMan.updateContract(this.contractUpdater, paramsProvider);

    this.logger.info(`write-prices status: ${RedstoneCommon.stringify(result)}`);

    const hash = FP.unwrapSuccess(result).transactionHash;

    await this.client.waitForTransaction(hash);

    return hash;
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.contractUpdater.getSignerAddress());
  }

  async transfer(toAddress: string, amount: number) {
    amount = amount * 10 ** 9;

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], toAddress);

    const signer = this.contractUpdater.getPrivateKey();

    return await this.client.signAndExecute(tx, signer);
  }

  static getContractUpdater(keypair: Keypair, client: SuiClient, config: SuiConfig) {
    const cacheKey = keypair.toSuiAddress();
    SuiWriteContractAdapter.contractUpdaterCache[cacheKey] ??= new SuiContractUpdater(
      client,
      keypair,
      config
    );

    return SuiWriteContractAdapter.contractUpdaterCache[cacheKey];
  }
}
