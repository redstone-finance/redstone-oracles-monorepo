import { consts } from "@redstone-finance/protocol";
import {
  ContractData,
  ContractParamsProvider,
  IPriceFeedContractAdapter,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { BlockProvider } from "./BlockchainService";
import { ContractAdapter } from "./ContractAdapter";
import { WriteContractAdapter } from "./WriteContractAdapter";

export async function sampleRun(
  paramsProvider: ContractParamsProvider,
  adapter: WriteContractAdapter,
  provider: BlockProvider,
  ethFeedConnector?: IPriceFeedContractAdapter,
  refreshStateCallback = async () => {}
) {
  await executePullModel(adapter, paramsProvider);
  const blockNumber = await provider.getBlockNumber();
  await executePushModel(adapter, paramsProvider, blockNumber, refreshStateCallback);

  await readFromPriceAdapter(adapter, paramsProvider, blockNumber);

  if (ethFeedConnector) {
    await readFromEthFeed(ethFeedConnector, blockNumber);
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
  const values = await adapter.readPricesFromContract(paramsProvider, blockNumber);

  console.log(
    `Values read from contract: ${String(values.map((v) => RedstoneCommon.convertValueDec(v, consts.DEFAULT_NUM_VALUE_DECIMALS)))}`
  );
  const readTimestamp = await adapter.readTimestampFromContract(
    paramsProvider.getDataFeedIds()[0],
    blockNumber
  );
  console.log(
    `Timestamp read from contract: ${readTimestamp} (${describeTimestamp(readTimestamp)})`
  );

  return blockNumber;
}

async function readFromPriceAdapter(
  adapter: ContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number
) {
  try {
    const lastUpdateBlockTimestamp = await adapter.readLatestUpdateBlockTimestamp(
      paramsProvider.getDataFeedIds()[0],
      blockNumber
    );
    console.log(
      `Last update block timestamp: ${lastUpdateBlockTimestamp} (${describeTimestamp(lastUpdateBlockTimestamp!)})`
    );

    const uniqueSignerThreshold = await adapter.getUniqueSignerThreshold(blockNumber);
    console.log(`Unique signer count: ${uniqueSignerThreshold}`);
  } catch {
    console.log(
      `Price data: \n${describeContractData(
        await adapter.readContractData(paramsProvider.getDataFeedIds(), blockNumber)
      )}`
    );
  }
}

async function readFromEthFeed(feedAdapter: IPriceFeedContractAdapter, blockNumber?: number) {
  const description = (await feedAdapter.getDescription?.(blockNumber)) ?? "ETH(???) PriceFeed";
  logHeader(`Viewing data from [${description}]`);

  const { value, timestamp } = await feedAdapter.getPriceAndTimestamp(blockNumber);

  const feedId = (await feedAdapter.getDataFeedId?.(blockNumber)) ?? "ETH(???)";
  const decimals = (await feedAdapter.decimals?.(blockNumber)) ?? consts.DEFAULT_NUM_VALUE_DECIMALS;

  console.log(
    `${feedId} price: $${RedstoneCommon.convertValueDec(value, decimals)} (${describeTimestamp(timestamp)}) (${decimals} decimals)`
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
