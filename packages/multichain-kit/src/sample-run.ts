import { consts } from "@redstone-finance/protocol";
import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { BlockProvider } from "./BlockchainService";
import { ContractAdapter } from "./ContractAdapter";
import { PriceFeedAdapter } from "./PriceFeedAdapter";
import { WriteContractAdapter } from "./WriteContractAdapter";

export async function sampleRun(
  paramsProvider: ContractParamsProvider,
  adapter: WriteContractAdapter,
  provider: BlockProvider,
  priceFeedAdapter?: PriceFeedAdapter,
  refreshStateCallback = async () => {}
) {
  await executePullModel(adapter, paramsProvider);
  const blockNumber = await provider.getBlockNumber();
  await executePushModel(adapter, paramsProvider, blockNumber, refreshStateCallback);

  await readFromContractAdapter(adapter, paramsProvider, blockNumber);

  if (priceFeedAdapter) {
    await readFromPriceFeed(priceFeedAdapter, blockNumber);
  }

  logHeader("FINISHING");
}

function logHeader(text: string, lineSize = 80) {
  console.log("");
  console.log("=".repeat(lineSize));
  console.log(text.toUpperCase());
  console.log("-".repeat(lineSize));
}

async function executePullModel(adapter: ContractAdapter, paramsProvider: ContractParamsProvider) {
  logHeader("Pulling values using core model");
  try {
    const coreValues = await adapter.getPricesFromPayload(paramsProvider);
    console.log(
      `Core values: ${String(coreValues.map((v) => RedstoneCommon.convertValueDec(v, consts.DEFAULT_NUM_VALUE_DECIMALS)))}`
    );
  } catch (e) {
    console.error(RedstoneCommon.stringifyError(e));
  }
}

async function executePushModel(
  adapter: WriteContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number,
  refreshStateCallback: () => Promise<void>
) {
  logHeader("Pushing values using classic model");
  const txId = await adapter.writePricesFromPayloadToContract(paramsProvider);

  console.log(`Update transaction ${txId}`);

  await refreshStateCallback();

  console.log(`Current block number: ${blockNumber}`);

  logHeader("Viewing values from contract");
  const [values, readTimestamp] = await Promise.all([
    adapter.readPricesFromContract(paramsProvider, blockNumber),
    adapter.readTimestampFromContract(paramsProvider.getDataFeedIds()[0], blockNumber),
  ]);

  console.log(
    `Values read from contract: ${String(values.map((v) => RedstoneCommon.convertValueDec(v, consts.DEFAULT_NUM_VALUE_DECIMALS)))}`
  );
  console.log(
    `Timestamp read from contract: ${readTimestamp} (${describeTimestamp(readTimestamp)})`
  );

  return blockNumber;
}

async function readFromContractAdapter(
  adapter: ContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number
) {
  try {
    const [lastUpdateBlockTimestamp, uniqueSignerThreshold, contractData] = await Promise.all([
      adapter.readLatestUpdateBlockTimestamp(paramsProvider.getDataFeedIds()[0], blockNumber),
      adapter.getUniqueSignerThreshold(blockNumber),
      adapter.readContractData(paramsProvider.getDataFeedIds(), blockNumber),
    ]);
    console.log(
      `Last update block timestamp: ${lastUpdateBlockTimestamp} (${describeTimestamp(lastUpdateBlockTimestamp!)})`
    );
    console.log(`Unique signer count: ${uniqueSignerThreshold}`);
    console.log(`Price data: \n${describeContractData(contractData)}`);
  } catch (e) {
    console.error(e);
  }
}

async function readFromPriceFeed(
  feedAdapter: PriceFeedAdapter,
  blockNumber?: number,
  defaultFeedId = "ETH(???)"
) {
  const description =
    (await feedAdapter.getDescription(blockNumber)) ?? `${defaultFeedId} PriceFeed`;
  logHeader(`Viewing data from [${description}]`);

  const [{ value, timestamp }, feedId, decimals] = await Promise.all([
    feedAdapter.getPriceAndTimestamp(blockNumber),
    feedAdapter.getDataFeedId(blockNumber),
    feedAdapter.getDecimals(blockNumber),
  ]);

  console.log(
    `${feedId ?? defaultFeedId} price: $${RedstoneCommon.convertValueDec(value, decimals ?? consts.DEFAULT_NUM_VALUE_DECIMALS)} (${describeTimestamp(timestamp)}) (${decimals} decimals)`
  );
}

export function describeTimestamp(timestamp: number) {
  return `${(Date.now() - timestamp) / 1000} sec. ago`;
}

export function describeContractData(data: ContractData) {
  return Object.entries(data)
    .map(
      ([key, value]) =>
        `${key}: ${RedstoneCommon.convertValueDec(value.lastValue, consts.DEFAULT_NUM_VALUE_DECIMALS)} of ${describeTimestamp(value.lastDataPackageTimestampMS)} / block: ${describeTimestamp(value.lastBlockTimestampMS)}`
    )
    .join("\n");
}
