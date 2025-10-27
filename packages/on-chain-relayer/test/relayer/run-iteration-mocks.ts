import { IRedstoneContractAdapter } from "@redstone-finance/evm-adapters";
import {
  ContractParamsProvider,
  DataServiceIds,
  getSignersForDataServiceId,
  IContractConnector,
} from "@redstone-finance/sdk";
import { IterationArgsMessage, RelayerConfig } from "../../src";
import { ContractData, ShouldUpdateContext } from "../../src/types";

class ContractAdapterMock implements IRedstoneContractAdapter {
  getSignerAddress(): Promise<string | undefined> {
    return Promise.resolve(undefined);
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

  writePricesFromPayloadToContract(_paramsProvider: ContractParamsProvider): Promise<void> {
    return Promise.resolve();
  }
}

export class ContractConnectorMock implements IContractConnector<ContractAdapterMock> {
  private adapter = new ContractAdapterMock();

  getAdapter(): Promise<ContractAdapterMock> {
    return Promise.resolve(this.adapter);
  }

  getBlockNumber(): Promise<number> {
    return Promise.resolve(123432);
  }

  waitForTransaction(_txId: string): Promise<boolean> {
    return Promise.resolve(true);
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
          dataPackagesIds: relayerConfig.dataFeeds,
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
