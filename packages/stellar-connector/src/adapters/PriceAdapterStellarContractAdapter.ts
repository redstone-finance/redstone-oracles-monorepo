import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
  LastRoundDetails,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import * as XdrUtils from "../XdrUtils";
import { StellarContractAdapter } from "./StellarContractAdapter";

// We estimate write_prices operations as `feedIds * signers`
const MAX_WRITE_PRICES_OPS = 33;

export class PriceAdapterStellarContractAdapter
  extends StellarContractAdapter
  implements IMultiFeedPricesContractAdapter
{
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
    const batchSize = MAX_WRITE_PRICES_OPS / paramsProvider.requestParams.uniqueSignersCount;
    const paramsProviders = paramsProvider.splitIntoFeedBatches(batchSize);

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

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    if (!this.txDeliveryMan) {
      throw new Error("Cannot write prices, txDeliveryMan not set");
    }
    const txDeliveryMan = this.txDeliveryMan;

    const updater = XdrUtils.addressToScVal(await this.getPublicKey());
    const metadataTimestamp = Date.now();

    const batchSize = MAX_WRITE_PRICES_OPS / paramsProvider.requestParams.uniqueSignersCount;
    const paramsProviders = paramsProvider.splitIntoFeedBatches(batchSize);

    const fns = paramsProviders.map((paramsProvider) => () => {
      return txDeliveryMan.sendTransaction(async () => {
        return this.contract.call(
          "write_prices",
          updater,
          ...(await this.prepareCallArgs(paramsProvider, metadataTimestamp))
        );
      });
    });

    const txHashes = await RedstoneCommon.batchPromises(1, 0, fns, true);

    return txHashes[txHashes.length - 1];
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
}
