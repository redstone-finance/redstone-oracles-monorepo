import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiClient } from "./SuiClient";
import { SuiReader } from "./SuiReader";
import { PriceAdapterDataContent, PriceAdapterDataJsonContent, PriceDataBcs } from "./types";

export class SuiPricesContractReader {
  constructor(
    private readonly suiReader: SuiReader,
    private readonly priceAdapterObjectId: string
  ) {}

  static createMultiReader(client: SuiClient, priceAdapterObjectId: string) {
    return MultiExecutor.createForSubInstances(
      client,
      (client) => new SuiPricesContractReader(new SuiReader(client), priceAdapterObjectId),
      {},
      {
        ...MultiExecutor.DEFAULT_CONFIG,
        defaultMode: MultiExecutor.ExecutionMode.AGREEMENT,
        singleExecutionTimeoutMs: MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: MultiExecutor.ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );
  }

  async getPriceAdapterObjectDataContent(_blockNumber?: number) {
    const content = await this.suiReader.fetchObjectDataContent({
      objectId: this.priceAdapterObjectId,
    });

    if (!RedstoneCommon.isDefined(content.content)) {
      return PriceAdapterDataJsonContent.parse(content.json);
    }

    return PriceAdapterDataContent.parse(content.content);
  }

  async getContractDataFromPricesTable(pricesTableId: string, blockNumber?: number) {
    const parsedResults = await this.getPriceDataContent(pricesTableId, blockNumber);

    const parseLastValue = (value: string) => {
      try {
        return BigInt(value);
      } catch {
        return 0n;
      }
    };

    const contractData = parsedResults.map((data) => [
      ContractParamsProvider.unhexlifyFeedId(data.feed_id),
      {
        lastDataPackageTimestampMS: parseInt(data.timestamp),
        lastBlockTimestampMS: parseInt(data.write_timestamp),
        lastValue: parseLastValue(data.value),
      },
    ]);

    return Object.fromEntries(contractData) as ContractData;
  }

  private async getPriceDataContent(pricesTableId: string, _blockNumber?: number) {
    const contents = await this.suiReader.fetchAllDynamicFieldContents(pricesTableId);

    return contents.map((data) => PriceDataBcs.parse(data.dynamicField.value.bcs));
  }
}
