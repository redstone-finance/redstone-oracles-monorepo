import { BlockProvider, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import {
  ContractParamsProvider,
  DataServiceIds,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { IterationArgsMessage, RelayerConfig } from "../../src";
import { ContractData, ShouldUpdateContext } from "../../src/types";

export class ContractAdapterMock implements WriteContractAdapter {
  getSignerAddress(): Promise<string> {
    return Promise.resolve("");
  }

  getUniqueSignerThreshold(_blockNumber?: number): Promise<number> {
    return Promise.resolve(1);
  }

  readLatestRoundContractData(_feedIds: string[], _blockNumber: number): Promise<ContractData> {
    return Promise.resolve({
      ETH: {
        lastDataPackageTimestampMS: 1732026000000,
        lastBlockTimestampMS: 1732026163000,
        lastValue: 30000n,
      },
      BTC: {
        lastDataPackageTimestampMS: 1732026000000,
        lastBlockTimestampMS: 1732026163000,
        lastValue: 90000n,
      },
    });
  }

  readContractData(feedIds: string[], blockNumber: number): Promise<ContractData> {
    return this.readLatestRoundContractData(feedIds, blockNumber);
  }

  writePricesFromPayloadToContract(_paramsProvider: ContractParamsProvider): Promise<string> {
    return Promise.resolve("");
  }

  getDataFeedIds?(): Promise<string[] | undefined> {
    throw new Error("Method not implemented.");
  }

  getPricesFromPayload(): Promise<bigint[]> {
    throw new Error("Method not implemented.");
  }

  readPricesFromContract(): Promise<bigint[]> {
    throw new Error("Method not implemented.");
  }

  readTimestampFromContract(): Promise<number> {
    throw new Error("Method not implemented.");
  }

  readLatestUpdateBlockTimestamp(): Promise<number | undefined> {
    throw new Error("Method not implemented.");
  }
}

export class BlockProviderMock implements BlockProvider {
  getBlockNumber(): Promise<number> {
    return Promise.resolve(123432);
  }
}

export function getIterationArgsProviderMock(
  shouldUpdatePrices = true,
  additionalUpdateMessages?: IterationArgsMessage[]
) {
  return (_shouldUpdateContext: ShouldUpdateContext, relayerConfig: RelayerConfig) =>
    Promise.resolve({
      shouldUpdatePrices,
      args: {
        blockTag: 123432,
        updateRequestParams: {
          dataPackagesIds: relayerConfig.dataPackagesNames ?? relayerConfig.dataFeeds,
          dataServiceId: relayerConfig.dataServiceId,
          uniqueSignersCount: 1,
          authorizedSigners: getSignersForDataServiceId(
            relayerConfig.dataServiceId as DataServiceIds
          ),
        },
        dataFeedsToUpdate: relayerConfig.dataFeeds,
      },
      messages: [{ message: "Test message" }],
      additionalUpdateMessages,
    });
}
