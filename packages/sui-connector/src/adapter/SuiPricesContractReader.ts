import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiClient } from "../client/SuiClient";
import { makeFeedIdBytes, uint8ArrayToBcs } from "../util";
import { PriceAdapterDataContent, PriceAdapterDataJsonContent, PriceDataBcs } from "./types";

const FEED_ID_TYPE = "vector<u8>";

export class SuiPricesContractReader {
  constructor(
    private readonly client: SuiClient,
    private readonly priceAdapterObjectId: string
  ) {}

  static createMultiReader(client: SuiClient, priceAdapterObjectId: string) {
    return MultiExecutor.createForSubInstances(
      client,
      (client) => new SuiPricesContractReader(client, priceAdapterObjectId),
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
    const content = await this.client.getObject(this.priceAdapterObjectId, blockNumber);

    if (!RedstoneCommon.isDefined(content.content)) {
      return PriceAdapterDataJsonContent.parse(content.json);
    }

    return PriceAdapterDataContent.parse(content.content);
  }

  async getContractDataFromPricesTable(
    pricesTableId: string,
    feedIds: string[],
    blockNumber?: number
  ) {
    const parsedResults = await this.getPriceDataContent(pricesTableId, feedIds, blockNumber);

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

  private async getPriceDataContent(
    pricesTableId: string,
    feedIds: string[],
    blockNumber?: number
  ) {
    const values = await this.client.getDynamicFieldValues(
      pricesTableId,
      feedIds.map((feedId) => ({
        type: FEED_ID_TYPE,
        bcs: uint8ArrayToBcs(makeFeedIdBytes(feedId)).toBytes(),
      })),
      blockNumber
    );

    return values.filter(RedstoneCommon.isDefined).map((value) => PriceDataBcs.parse(value));
  }
}
