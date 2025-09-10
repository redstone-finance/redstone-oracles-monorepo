import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
  LastRoundDetails,
} from "@redstone-finance/sdk";
import _ from "lodash";
import * as XdrUtils from "../XdrUtils";
import { StellarContractAdapter } from "./StellarContractAdapter";

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

    return await this.rpcClient.simulateOperation(operation, await this.getPublicKey(), (sim) =>
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
    const operation = this.contract.call(
      "get_prices",
      ...(await this.prepareCallArgs(paramsProvider))
    );

    const sim = await this.rpcClient.simulateOperation(
      operation,
      await this.getPublicKey(),
      XdrUtils.parseGetPricesSimulation
    );

    return sim.prices;
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    if (!this.txDeliveryMan) {
      throw new Error("Cannot write prices, txDeliveryMan not set");
    }

    const updater = XdrUtils.addressToScVal(await this.getPublicKey());
    const metadataTimestamp = Date.now();

    return await this.txDeliveryMan.sendTransaction(async () => {
      return this.contract.call(
        "write_prices",
        updater,
        ...(await this.prepareCallArgs(paramsProvider, metadataTimestamp))
      );
    });
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, _blockNumber?: number) {
    const feedIds = paramsProvider.getDataFeedIds();

    return (await this.getContractData(feedIds)).map((data) => data[1]!.lastValue);
  }

  async readTimestampFromContract(feedId: string, _blockNumber?: number) {
    return (await this.readContractData([feedId]))[feedId].lastDataPackageTimestampMS;
  }

  private async getContractData(
    feedIds: string[]
  ): Promise<[string, LastRoundDetails | undefined][]> {
    const promises = feedIds.map(async (feedId) => {
      const key = XdrUtils.stringToScVal(feedId);
      const settledResult = this.rpcClient.getContractData(
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
