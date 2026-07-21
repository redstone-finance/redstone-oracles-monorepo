import { time } from "@nomicfoundation/hardhat-network-helpers";
import { DataPackage, INumericDataPoint, NumericDataPoint } from "@redstone-finance/protocol";
import {
  ContractParamsProvider,
  DataPackagesResponse,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { formatBytes32String } from "ethers/lib/utils";

export const ETH_PRICE = 1670.99;
export const BTC_PRICE = 23077.68;
export const ethDataFeed = formatBytes32String("ETH");
export const btcDataFeed = formatBytes32String("BTC");
const MULTI_POINT_DATA_PACKAGE_ID = "__MULTI__";
const BASE_CACHE_PARAMS = {
  authorizedSigners: ["0x01"],
  dataServiceId: "redstone-main-demo",
  uniqueSignersCount: 1,
};
const DEFAULT_DATA_POINTS = [
  { dataFeedId: "ETH", value: ETH_PRICE },
  { dataFeedId: "BTC", value: BTC_PRICE },
];

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

export class ContractParamsProviderMock extends ContractParamsProvider {
  constructor(
    protected readonly dataPoints: INumericDataPoint[] = DEFAULT_DATA_POINTS,
    cache?: DataPackagesResponseCache
  ) {
    super(
      {
        ...BASE_CACHE_PARAMS,
        dataPackagesIds: dataPoints.map((dp) => dp.dataFeedId),
      },
      cache
    );
  }

  override performRequestingDataPackages() {
    return getDataPackagesResponse(this.dataPoints);
  }
}

export class ContractParamsProviderMockMulti extends ContractParamsProviderMock {
  override performRequestingDataPackages() {
    return getMultiPointDataPackagesResponse(this.dataPoints);
  }
}

const getDataPackagesResponse = async (dataPoints: INumericDataPoint[]) => {
  const timestampMilliseconds = (await time.latest()) * 1000;
  const signedDataPackages: DataPackagesResponse = {};

  for (const mockWallet of mockWallets) {
    for (const dataPointObj of dataPoints) {
      const dataPoint = new NumericDataPoint(dataPointObj);
      const dataPackage = new DataPackage([dataPoint], timestampMilliseconds, dataPoint.dataFeedId);
      signedDataPackages[dataPointObj.dataFeedId] ??= [];
      signedDataPackages[dataPointObj.dataFeedId]!.push(dataPackage.sign(mockWallet.privateKey));
    }
  }

  return signedDataPackages;
};

const getMultiPointDataPackagesResponse = async (dataPoints: INumericDataPoint[]) => {
  const timestampMilliseconds = (await time.latest()) * 1000;
  const signedDataPackages: DataPackagesResponse = {};

  for (const mockWallet of mockWallets) {
    const dataPackage = new DataPackage(
      dataPoints.map((dp) => new NumericDataPoint(dp)),
      timestampMilliseconds,
      MULTI_POINT_DATA_PACKAGE_ID
    );
    signedDataPackages[MULTI_POINT_DATA_PACKAGE_ID] ??= [];
    signedDataPackages[MULTI_POINT_DATA_PACKAGE_ID].push(dataPackage.sign(mockWallet.privateKey));
  }

  return signedDataPackages;
};
