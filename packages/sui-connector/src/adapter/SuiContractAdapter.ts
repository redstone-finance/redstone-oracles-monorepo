import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import {
  ContractAdapter,
  MultiTxDeliveryMan,
  TxDeliveryMan,
  WriteContractAdapter,
} from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { SuiClient } from "../client/SuiClient";
import { SuiConfig } from "../config";
import { MAX_PARALLEL_TRANSACTION_COUNT, SuiContractUpdater } from "./SuiContractUpdater";
import { SuiPricesContractReader } from "./SuiPricesContractReader";

const ESTIMATED_GROSS_COST_PER_SIGNATURE_SUI = 0.005;
const MAX_SIGNATURES_PER_TRANSACTION = 12;

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
}

export class SuiWriteContractAdapter extends SuiContractAdapter implements WriteContractAdapter {
  static contractUpdaterCache = new Map<string, SuiContractUpdater>();

  private readonly txDeliveryMan: TxDeliveryMan;
  private readonly contractUpdater: SuiContractUpdater;
  private readonly logger = loggerFactory("sui-prices-contract-adapter");

  constructor(client: SuiClient, keypair: Keypair, config: SuiConfig) {
    super(client, config);

    this.txDeliveryMan = new MultiTxDeliveryMan(
      {
        ...config,
        batchSizePerRequestParams: ({ uniqueSignersCount }) =>
          feedsPerTransaction(config.writePricesTxGasBudget, uniqueSignersCount),
        maxParallelTxCount: MAX_PARALLEL_TRANSACTION_COUNT,
      },
      "sui-tx-delivery-man"
    );
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
    const cache = SuiWriteContractAdapter.contractUpdaterCache;
    let updater = cache.get(cacheKey);
    if (!updater) {
      updater = new SuiContractUpdater(client, keypair, config);
      cache.set(cacheKey, updater);
    }

    return updater;
  }
}

function feedsPerTransaction(gasBudget: bigint, signerCount: number) {
  const costPerFeedMist =
    ESTIMATED_GROSS_COST_PER_SIGNATURE_SUI * signerCount * Number(MIST_PER_SUI);
  const feedCount = Math.floor(Number(gasBudget) / costPerFeedMist);

  return _.clamp(feedCount, 1, Math.floor(MAX_SIGNATURES_PER_TRANSACTION / signerCount));
}
