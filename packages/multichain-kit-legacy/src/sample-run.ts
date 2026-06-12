import {
  convertValueDec,
  describeContractData,
  describeTimestamp,
  logHeader,
  PriceFeedAdapter,
  readFromPriceFeed,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { IContractConnector } from "./IContractConnector";
import { LegacyPricesContractAdapter } from "./LegacyInterfaces";

export async function sampleRun(
  paramsProvider: ContractParamsProvider,
  adapter: LegacyPricesContractAdapter,
  connector: IContractConnector<LegacyPricesContractAdapter>,
  priceFeedAdapter?: PriceFeedAdapter,
  refreshStateCallback = async () => {}
) {
  await executePullModel(adapter, paramsProvider);
  const blockNumber = await connector.getBlockNumber();
  await executePushModel(adapter, paramsProvider, blockNumber, refreshStateCallback);

  await readFromContractAdapter(adapter, paramsProvider.getDataFeedIds(), blockNumber);

  if (priceFeedAdapter) {
    await readFromPriceFeed(priceFeedAdapter, blockNumber);
  }

  logHeader("FINISHING");
}

async function executePullModel(
  adapter: LegacyPricesContractAdapter,
  paramsProvider: ContractParamsProvider
) {
  logHeader("Pulling values using core model");
  try {
    const coreValues = await adapter.getPricesFromPayload(paramsProvider);
    console.log(`Core values: ${String(coreValues.map((v) => convertValueDec(v)))}`);
  } catch (e) {
    console.error(RedstoneCommon.stringifyError(e));
  }
}

async function executePushModel(
  adapter: LegacyPricesContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number,
  refreshStateCallback: () => Promise<void>
) {
  logHeader("Pushing values using classic model");
  const txId = await adapter.writePricesFromPayloadToContract(paramsProvider);

  console.log(`Update transaction ${String(txId)}`);

  await refreshStateCallback();

  console.log(`Current block number: ${blockNumber}`);

  logHeader("Viewing values from contract");
  const [values, readTimestamp, uniqueSignerThreshold] = await Promise.all([
    adapter.readPricesFromContract(paramsProvider, blockNumber),
    adapter.readTimestampFromContract(paramsProvider.getDataFeedIds()[0], blockNumber),
    adapter.getUniqueSignerThreshold(blockNumber),
  ]);

  console.log(`Unique signer count: ${uniqueSignerThreshold}`);
  console.log(`Values read from contract: ${String(values.map((v) => convertValueDec(v)))}`);
  console.log(
    `Timestamp read from contract: ${readTimestamp} (${describeTimestamp(readTimestamp)})`
  );
}

async function readFromContractAdapter(
  adapter: LegacyPricesContractAdapter,
  feedIds: string[],
  blockNumber?: number
) {
  try {
    const [lastUpdateBlockTimestamp, contractData] = await Promise.all([
      adapter.readLatestUpdateBlockTimestamp(feedIds[0], blockNumber),
      adapter.readContractData(feedIds, blockNumber),
    ]);
    console.log(
      `Last update block timestamp: ${lastUpdateBlockTimestamp} (${describeTimestamp(lastUpdateBlockTimestamp!)})`
    );
    console.log(`Price data: \n${describeContractData(contractData)}`);
  } catch (e) {
    console.error(e);
  }
}
