import { SuiClient } from "@mysten/sui/client";
import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { MultiExecutor } from "@redstone-finance/utils";
import { SuiReader } from "./SuiReader";
import { PriceAdapterDataContent, PriceDataContent } from "./types";

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

  async getPriceAdapterObjectDataContent(blockNumber?: number) {
    const content = await this.suiReader.fetchObjectDataContent(
      { objectId: this.priceAdapterObjectId },
      blockNumber
    );

    return PriceAdapterDataContent.parse(content);
  }

  async getContractDataFromPricesTable(pricesTableId: string, blockNumber?: number) {
    const parsedResults = await this.getPriceDataContent(pricesTableId, blockNumber);

    const contractData = parsedResults.map((data) => [
      ContractParamsProvider.unhexlifyFeedId(data.feed_id),
      {
        lastDataPackageTimestampMS: parseInt(data.timestamp),
        lastBlockTimestampMS: parseInt(data.write_timestamp),
        lastValue: BigInt(data.value),
      },
    ]);

    return Object.fromEntries(contractData) as ContractData;
  }

  private async getPriceDataContent(pricesTableId: string, blockNumber?: number) {
    const ids = await this.suiReader.getObjectIds(pricesTableId);
    const values = await Promise.all(
      ids.map((input) => this.suiReader.fetchObjectDataContent(input, blockNumber))
    );

    return values.map((data) => PriceDataContent.parse(data).value);
  }
}
