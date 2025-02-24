import { RedstoneCommon } from "@redstone-finance/utils";
import { BigNumber, BigNumberish } from "ethers";
import { ContractData } from "../ContractData";
import { ContractParamsProvider } from "../ContractParamsProvider";
import { IContractConnector } from "../IContractConnector";
import { IPriceFeedContractAdapter } from "./IPriceFeedContractAdapter";
import {
  IExtendedPricesContractAdapter,
  IMultiFeedPricesContractAdapter,
  IPricesContractAdapter,
} from "./IPricesContractAdapter";

/* eslint-disable @typescript-eslint/restrict-template-expressions */

export async function sampleRun(
  paramsProvider: ContractParamsProvider,
  pricesConnector: IContractConnector<IPricesContractAdapter>,
  ethFeedConnector?: IContractConnector<IPriceFeedContractAdapter>,
  refreshStateCallback = async () => {}
) {
  const pricesAdapter = await pricesConnector.getAdapter();
  await executePullModel(pricesAdapter, paramsProvider);
  const blockNumber = await executePushModel(
    pricesAdapter,
    paramsProvider,
    pricesConnector,
    refreshStateCallback
  );

  if (isMultiFeedContractAdapter(pricesAdapter)) {
    await readFromMultiFeedPriceAdapter(
      pricesAdapter,
      paramsProvider,
      blockNumber
    );
  }

  if (isExtendedPricesContractAdapter(pricesAdapter)) {
    await readFromExtendedPriceAdapter(
      pricesAdapter,
      paramsProvider,
      blockNumber
    );
  }

  if (ethFeedConnector) {
    await readFromEthFeed(ethFeedConnector);
  }

  logHeader("FINISHING");
}

function logHeader(text: string, lineSize = 80) {
  console.log("");
  console.log("=".repeat(lineSize));
  console.log(text.toUpperCase());
  console.log("-".repeat(lineSize));
}

async function executePullModel(
  pricesAdapter: IPricesContractAdapter,
  paramsProvider: ContractParamsProvider
) {
  logHeader("Pulling values using core model");
  try {
    const coreValues = await pricesAdapter.getPricesFromPayload(paramsProvider);
    console.log(`Core values: ${coreValues.map(convertValue)}`);
  } catch (e) {
    console.error(RedstoneCommon.stringifyError(e));
  }
}

async function executePushModel(
  pricesAdapter: IPricesContractAdapter,
  paramsProvider: ContractParamsProvider,
  pricesConnector: IContractConnector<IPricesContractAdapter>,
  refreshStateCallback: () => Promise<void>
) {
  logHeader("Pushing values using classic model");
  const deployHash =
    await pricesAdapter.writePricesFromPayloadToContract(paramsProvider);

  if (typeof deployHash == "string") {
    await pricesConnector.waitForTransaction(deployHash);
  } else {
    console.log(`Values pushed to contract: ${deployHash}`);
  }

  await refreshStateCallback();

  const blockNumber = await pricesConnector.getBlockNumber();
  console.log(`Current block number: ${blockNumber}`);

  logHeader("Viewing values from contract");
  const values = await pricesAdapter.readPricesFromContract(
    paramsProvider,
    blockNumber
  );

  console.log(`Values read from contract: ${values.map(convertValue)}`);
  const readTimestamp = await pricesAdapter.readTimestampFromContract(
    paramsProvider.getDataFeedIds()[0],
    blockNumber
  );
  console.log(
    `Timestamp read from contract: ${readTimestamp} (${describeTimestamp(readTimestamp)})`
  );
  return blockNumber;
}

async function readFromMultiFeedPriceAdapter(
  pricesAdapter: IMultiFeedPricesContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number
) {
  console.log(
    `Price data: \n${describeContractData(
      await pricesAdapter.readContractData(
        paramsProvider.getDataFeedIds(),
        blockNumber
      )
    )}`
  );
}

async function readFromExtendedPriceAdapter(
  pricesAdapter: IExtendedPricesContractAdapter,
  paramsProvider: ContractParamsProvider,
  blockNumber: number
) {
  const lastUpdateBlockTimestamp =
    await pricesAdapter.readLatestUpdateBlockTimestamp(
      paramsProvider.getDataFeedIds()[0],
      blockNumber
    );
  console.log(
    `Last update block timestamp: ${lastUpdateBlockTimestamp} (${describeTimestamp(lastUpdateBlockTimestamp!)})`
  );

  const uniqueSignerThreshold =
    await pricesAdapter.getUniqueSignerThreshold(blockNumber);
  console.log(`Unique signer count: ${uniqueSignerThreshold}`);
}

async function readFromEthFeed(
  ethFeedConnector: IContractConnector<IPriceFeedContractAdapter>
) {
  const feedAdapter = await ethFeedConnector.getAdapter();

  const description = feedAdapter.getDescription
    ? await feedAdapter.getDescription()
    : "ETH PriceFeed";
  logHeader(`Viewing data from [${description}]`);

  const { value, timestamp } = await feedAdapter.getPriceAndTimestamp();

  const feedId = feedAdapter.getDataFeedId
    ? await feedAdapter.getDataFeedId()
    : "ETH";

  console.log(
    `${feedId} price: $${convertValue(value)} (${describeTimestamp(timestamp)})`
  );
}

export function convertValue(v: BigNumberish) {
  return BigNumber.from(v).toNumber() / 10 ** 8;
}

export function describeTimestamp(timestamp: number) {
  return `${(Date.now() - timestamp) / 1000} sec. ago`;
}

export function describeContractData(data: ContractData) {
  return Object.entries(data)
    .map(
      ([key, value]) =>
        `${key}: ${convertValue(value.lastValue)} of ${describeTimestamp(value.lastDataPackageTimestampMS)} / block: ${describeTimestamp(value.lastBlockTimestampMS)}`
    )
    .join("\n");
}

export function isExtendedPricesContractAdapter(
  priceAdapter: IPricesContractAdapter
): priceAdapter is IExtendedPricesContractAdapter {
  const adapter = priceAdapter as IExtendedPricesContractAdapter;

  return (
    typeof adapter.getUniqueSignerThreshold === "function" &&
    typeof adapter.readLatestUpdateBlockTimestamp === "function"
  );
}

export function isMultiFeedContractAdapter(
  priceAdapter: IPricesContractAdapter
): priceAdapter is IMultiFeedPricesContractAdapter {
  const adapter = priceAdapter as IMultiFeedPricesContractAdapter;

  return typeof adapter.readContractData === "function";
}
