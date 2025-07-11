import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { providers, Wallet } from "ethers";
import { PriceAdapterService } from "./PriceAdapterService";

async function main() {
  const dataPackagesIds = ["ETH", "BTC"];
  const requestParams: DataPackagesRequestParams = {
    dataPackagesIds,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    enableEnhancedLogs: true,
  };

  const contractAddress = RedstoneCommon.getFromEnv("CONTRACT_ADDRESS");
  const privateKey = RedstoneCommon.getFromEnv("PRIVATE_KEY");
  const rpcUrl = RedstoneCommon.getFromEnv("RPC_URL");
  const provider = new providers.JsonRpcProvider(rpcUrl);

  const paramsProvider = new ContractParamsProvider(requestParams);
  const feeds = paramsProvider.getHexlifiedFeedIds(true, 32);
  const payload = await paramsProvider.getPayloadHex();
  const wallet = new Wallet(privateKey, provider);

  const priceAdapter = new PriceAdapterService(contractAddress, wallet);
  await readData(priceAdapter, feeds, dataPackagesIds);

  console.log(`\nWriting prices for [${dataPackagesIds.toString()}]...`);

  const tx = await priceAdapter.writePrices(feeds, payload);
  console.log(tx.hash);
  const receipt = await tx.wait();
  console.log(`Prices written; Gas used: ${receipt.gasUsed.toBigInt()}`);

  await readData(priceAdapter, feeds, dataPackagesIds);
}

async function readData(
  priceAdapter: PriceAdapterService,
  feeds: string[],
  dataPackagesIds: string[]
) {
  const data = await priceAdapter.readPriceData(feeds);
  console.log(`\nReading data for [${dataPackagesIds.toString()}]...`);
  for (const [index, feedId] of dataPackagesIds.entries()) {
    console.log(
      [
        `Current contract price for ${feedId}: ${data[index].value.toNumber() / 10 ** 8}`,
        `dataTimestamp: ${new Date(data[index].dataTimestamp.toNumber()).toString()}`,
        `written (blockTimestamp) ${(Date.now() - data[index].blockTimestamp.toNumber() * 1000) / 1000} [s] ago`,
      ].join("\n   ")
    );
  }
}

void main();
