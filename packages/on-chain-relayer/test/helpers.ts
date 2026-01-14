import { time } from "@nomicfoundation/hardhat-network-helpers";
import { DataPackage, INumericDataPoint, NumericDataPoint } from "@redstone-finance/protocol";
import {
  HARDHAT_CHAIN_ID,
  RewardsPerBlockAggregationAlgorithm,
} from "@redstone-finance/rpc-providers";
import {
  calculateHistoricalPackagesTimestamp,
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { formatBytes32String } from "ethers/lib/utils";
import { RelayerConfig } from "../src";

export const ethDataFeed = formatBytes32String("ETH");
export const btcDataFeed = formatBytes32String("BTC");
export const ETH_PRICE = 1670.99;
export const BTC_PRICE = 23077.68;
export const MULTI_POINT_DATA_PACKAGE_ID = "__MULTI__";

export const dataFeedsIds = [ethDataFeed, btcDataFeed];

export const mockConfig = (overrideMockConfig: Partial<RelayerConfig> = {}) => {
  return {
    relayerIterationInterval: 10,
    rpcUrls: ["http://127.0.0.1:8545"],
    chainName: "HardhatNetwork",
    networkId: HARDHAT_CHAIN_ID,
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // well-known private key for the first hardhat account
    adapterContractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    dataServiceId: "redstone-main-demo",
    dataFeeds: ["ETH", "BTC"],
    gasLimit: 1000000,
    rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm.Max,
    updateConditions: {
      ETH: ["time", "value-deviation"],
      BTC: ["time", "value-deviation"],
    },
    updateTriggers: {
      ETH: {
        deviationPercentage: 10,
        timeSinceLastUpdateInMilliseconds: 1000,
      },
      BTC: {
        deviationPercentage: 10,
        timeSinceLastUpdateInMilliseconds: 1000,
      },
    },
    adapterContractType: "price-feeds",
    fallbackOffsetInMilliseconds: overrideMockConfig.fallbackOffsetInMilliseconds ?? 0,
    healthcheckPingUrl: "http://example.com/ping",
    ...overrideMockConfig,
  } as RelayerConfig;
};

export const DEFAULT_DATA_POINTS = [
  { dataFeedId: "ETH", value: ETH_PRICE },
  { dataFeedId: "BTC", value: BTC_PRICE },
];

export class ContractParamsProviderMock extends ContractParamsProvider {
  constructor(
    protected readonly dataPoints: INumericDataPoint[] = DEFAULT_DATA_POINTS,
    overrideRequestParamsPackagesIds?: string[],
    cache?: DataPackagesResponseCache
  ) {
    super(
      {
        dataPackagesIds: dataPoints.map((dp) => dp.dataFeedId),
      } as unknown as DataPackagesRequestParams,
      cache,
      overrideRequestParamsPackagesIds
    );
  }

  override performRequestingDataPackages() {
    return getDataPackagesResponse(this.dataPoints);
  }
}

export class ContractParamsProviderMockMulti extends ContractParamsProviderMock {
  constructor(
    private dataPackageId = MULTI_POINT_DATA_PACKAGE_ID,
    dataPoints: INumericDataPoint[] = DEFAULT_DATA_POINTS,
    cache?: DataPackagesResponseCache
  ) {
    super(dataPoints, undefined, cache);
  }

  override performRequestingDataPackages() {
    return getMultiPointDataPackagesResponse(this.dataPackageId, this.dataPoints);
  }
}

const mockWallets = [
  {
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
];

export const getDataPackagesResponse = async (
  dataPoints: INumericDataPoint[] = DEFAULT_DATA_POINTS,
  isHistorical = false,
  overrideMockedTime?: number
) => {
  const currentTime = overrideMockedTime ?? (await time.latest()) * 1000;
  const timestampMilliseconds = isHistorical
    ? calculateHistoricalPackagesTimestamp(10000, currentTime)!
    : currentTime;

  const signedDataPackages: DataPackagesResponse = {};

  for (const mockWallet of mockWallets) {
    for (const dataPointObj of dataPoints) {
      const dataPoint = new NumericDataPoint(dataPointObj);
      const mockDataPackage = {
        signer: mockWallet.address,
        dataPackage: new DataPackage([dataPoint], timestampMilliseconds, dataPoint.dataFeedId),
      };
      const privateKey = mockWallet.privateKey;
      const signedDataPackage = mockDataPackage.dataPackage.sign(privateKey);
      if (!signedDataPackages[dataPointObj.dataFeedId]) {
        signedDataPackages[dataPointObj.dataFeedId] = [];
      }
      signedDataPackages[dataPointObj.dataFeedId]!.push(signedDataPackage);
    }
  }
  return signedDataPackages;
};

export const getMultiPointDataPackagesResponse = async (
  dataPackageId = MULTI_POINT_DATA_PACKAGE_ID,
  dataPoints: INumericDataPoint[] = DEFAULT_DATA_POINTS
) => {
  const timestampMilliseconds = (await time.latest()) * 1000;

  const signedDataPackages: DataPackagesResponse = {};

  for (const mockWallet of mockWallets) {
    const mockDataPackage = {
      signer: mockWallet.address,
      dataPackage: new DataPackage(
        dataPoints.map((dp) => new NumericDataPoint(dp)),
        timestampMilliseconds,
        dataPackageId
      ),
    };
    const privateKey = mockWallet.privateKey;
    const signedDataPackage = mockDataPackage.dataPackage.sign(privateKey);
    signedDataPackages[dataPackageId] ??= [];
    signedDataPackages[dataPackageId].push(signedDataPackage);
  }
  return signedDataPackages;
};

export const dateStrToMilliseconds = (str: string) => new Date(str).getTime();
export const setCurrentSystemTime = (str: string) => {
  Date.now = () => dateStrToMilliseconds(str);
};
export const originalDateNow = Date.now;
export const restoreOriginalSystemTime = () => {
  Date.now = originalDateNow;
};
