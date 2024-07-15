import { time } from "@nomicfoundation/hardhat-network-helpers";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import type { BigNumber } from "ethers";
import { formatBytes32String } from "ethers/lib/utils";
import { ethers } from "hardhat";

export type CheckOracleDataWithContractsArgs = {
  contractName: string;
  uniqueSignersCount: number;
};

const deployContract = async () => {
  const ContractFactory = await ethers.getContractFactory(
    "RedstoneMockConsumer"
  );
  const contract = await ContractFactory.deploy();
  await contract.deployed();
  return contract;
};

const advanceTime = async () => {
  await time.increaseTo(new Date());
};

const getCacheServiceUrls = (): string[] => {
  if (process.env.CACHE_SERVICE_URLS) {
    return JSON.parse(process.env.CACHE_SERVICE_URLS) as string[];
  } else {
    return ["http://localhost:3000"];
  }
};

// try to be compatible with all versions of SDK
// sdk will use one of 'dataFeeds' or 'dataPackagesIds'
// based on version used. The other one will be ignored.
const getWrapperParams = (dataFeeds: string[]) => ({
  dataServiceId: "mock-data-service",
  uniqueSignersCount: 2,
  urls: getCacheServiceUrls(),
  dataFeeds,
  dataPackagesIds: dataFeeds,
});

type ExpectedPrices = {
  [token: string]: number;
};
const verifyPrice = (
  token: string,
  priceFromContract: BigNumber,
  allPrices: ExpectedPrices
) => {
  if (!priceFromContract.eq(allPrices[token] * 10 ** 8)) {
    throw new Error(
      `Expected price of ${token}: ${allPrices[token]}, got ${priceFromContract.toString()}`
    );
  }
};
export const checkOracleDataWithContracts = async () => {
  const expectedPrices = JSON.parse(
    process.env.PRICES_TO_CHECK ?? "[]"
  ) as ExpectedPrices;
  const allDataFeedIds = ["BTC", "ETH", "AAVE"];
  const allDataFeedIdsB32 = allDataFeedIds.map(formatBytes32String);
  const btcBytes32 = formatBytes32String("BTC");
  const ethBytes32 = formatBytes32String("ETH");
  const contract = await deployContract();

  const wrappedContractSinglePackage = WrapperBuilder.wrap(
    contract
  ).usingDataService(getWrapperParams(["BTC"]));
  await advanceTime();
  const btcPrice =
    await wrappedContractSinglePackage.getLatestPrice(btcBytes32);
  verifyPrice("BTC", btcPrice, expectedPrices);

  const wrappedContractMultiplePackages = WrapperBuilder.wrap(
    contract
  ).usingDataService(getWrapperParams(allDataFeedIds));
  await advanceTime();
  const allPrices =
    await wrappedContractMultiplePackages.getLatestPricesForManyAssets(
      allDataFeedIdsB32
    );
  for (let i = 0; i < allDataFeedIds.length; ++i) {
    verifyPrice(allDataFeedIds[i], allPrices[i], expectedPrices);
  }

  const wrappedContract = WrapperBuilder.wrap(contract).usingDataService(
    getWrapperParams(["___COOL_TOKENS___"])
  );
  await advanceTime();
  const btcEthPrices = await wrappedContract.getLatestPricesForManyAssets([
    btcBytes32,
    ethBytes32,
  ]);
  verifyPrice("BTC", btcEthPrices[0], expectedPrices);
  verifyPrice("ETH", btcEthPrices[1], expectedPrices);
};

void checkOracleDataWithContracts();
