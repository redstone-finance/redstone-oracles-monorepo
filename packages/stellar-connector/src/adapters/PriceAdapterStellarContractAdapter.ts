import {
  ContractData,
  ContractParamsProvider,
  IExtendedPricesContractAdapter,
  LastRoundDetails,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { splitParamsIntoBatches } from "../split-params-into-batches";
import { StellarContractUpdater } from "../stellar/StellarContractUpdater";
import * as XdrUtils from "../XdrUtils";
import { StellarContractAdapter } from "./StellarContractAdapter";

export class PriceAdapterStellarContractAdapter
  extends StellarContractAdapter
  implements IExtendedPricesContractAdapter
{
  private readonly logger = loggerFactory("stellar-price-adapter");

  async init(owner: string) {
    return await this.initContract(owner);
  }

  async readContractData(feedIds: string[], _blockNumber?: number) {
    const data = await this.getContractData(feedIds);

    return Object.fromEntries(data) as ContractData;
  }

  async getUniqueSignerThreshold(_blockNumber?: number) {
    const operation = this.contract.call("unique_signer_threshold");

    return await this.client.simulateOperation(operation, await this.getPublicKey(), (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async readLatestUpdateBlockTimestamp(feedId: string, _blockNumber?: number) {
    return (await this.getContractData([feedId]))[0][1]!.lastBlockTimestampMS;
  }

  async getSignerAddress() {
    return await this.getPublicKey();
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const paramsProviders = splitParamsIntoBatches(paramsProvider);

    const promises = paramsProviders.map(async (paramsProvider) => {
      const operation = this.contract.call(
        "get_prices",
        ...(await this.prepareCallArgs(paramsProvider))
      );

      const sim = await this.client.simulateOperation(
        operation,
        await this.getPublicKey(),
        XdrUtils.parseGetPricesSimulation
      );

      return sim.prices;
    });

    const prices = await Promise.all(promises);

    return prices.flat();
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    if (!this.operationSender) {
      throw new Error("Cannot write prices, OperationSender not set");
    }

    const updater = new StellarContractUpdater(this.operationSender.getExecutor(), this.contract);
    const result = await this.operationSender.updateContract(updater, paramsProvider);

    if (options && Object.keys(options.feedAddresses).length > 0) {
      const feedAddresses = _.at(options.feedAddresses, paramsProvider.getDataFeedIds());
      void this.maybeExtendTtlForPriceFeeds(feedAddresses);
    }

    return FP.unwrapSuccess(result).transactionHash;
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, _blockNumber?: number) {
    const feedIds = paramsProvider.getDataFeedIds();

    return (await this.getContractData(feedIds)).map((data) => data[1]?.lastValue ?? 0n);
  }

  async readTimestampFromContract(feedId: string, _blockNumber?: number) {
    return (await this.readContractData([feedId]))[feedId].lastDataPackageTimestampMS;
  }

  private async getContractData(
    feedIds: string[]
  ): Promise<[string, LastRoundDetails | undefined][]> {
    const promises = feedIds.map(async (feedId) => {
      const key = XdrUtils.stringToScVal(feedId);
      const settledResult = this.client.getContractData(
        this.contract,
        key,
        XdrUtils.parsePriceDataFromContractData
      );

      return await settledResult;
    });

    const results = _.zip(feedIds, await Promise.allSettled(promises)) as unknown as [
      string,
      PromiseSettledResult<LastRoundDetails>,
    ][];

    return results.map(([feedId, settledResult]) => {
      switch (settledResult.status) {
        case "fulfilled":
          return [feedId, settledResult.value];
        case "rejected":
          return [feedId, undefined];
      }
    });
  }

  async prepareCallArgs(paramsProvider: ContractParamsProvider, metadataTimestamp = Date.now()) {
    const feedIdsScVal = XdrUtils.mapArrayToScVec(
      paramsProvider.getDataFeedIds(),
      XdrUtils.stringToScVal
    );

    const payloadScVal = XdrUtils.numbersToScvBytes(
      await paramsProvider.getPayloadData({
        withUnsignedMetadata: true,
        metadataTimestamp,
        componentName: "stellar-connector",
      })
    );

    return [feedIdsScVal, payloadScVal];
  }

  private async maybeExtendTtlForPriceFeeds(addresses: string[]) {
    const addressesToUpdate = await this.client.getAddressesToExtendInstanceTtl(addresses);

    if (!addressesToUpdate.length) {
      this.logger.info("No contracts to extend instance TTL");
    } else {
      this.logger.log(`Contracts to extend instance TTL: [${addressesToUpdate.join(`,`)}]`);
    }

    if (!this.operationSender) {
      throw new Error("Cannot extend instance ttls, OperationSender not set");
    }

    const signer = this.operationSender.signer;

    await RedstoneCommon.batchPromises(
      1,
      0,
      addressesToUpdate.map((address) => {
        return () => this.client.extendInstanceTtl(address, signer);
      })
    );
  }
}
