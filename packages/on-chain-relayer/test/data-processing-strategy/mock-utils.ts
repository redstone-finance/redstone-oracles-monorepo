import { SignedDataPackage, SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import { DataPackagesResponse, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  MqttDataProcessingStrategy,
  MqttDataProcessingStrategyDelegate,
} from "../../src/runner/strategy/MqttDataProcessingStrategy";

export interface DataPackagesResponseInput {
  dataFeedId: string;
  value: number;
  timestampMilliSeconds: number;
}

export const SINGLE_RUN_MS = 2000;
export const ETH_PRICE = 4200;
export const BASE_TS = 1760510000;
export const LATER_TS = 1000;
export const BTC_PRICE = 113000;
export const USDT_PRICE = 1;
export const ETH_DATA_POINT: DataPackagesResponseInput = {
  dataFeedId: "ETH",
  value: ETH_PRICE,
  timestampMilliSeconds: BASE_TS,
};
export const BTC_DATA_POINT: DataPackagesResponseInput = {
  dataFeedId: "BTC",
  value: BTC_PRICE,
  timestampMilliSeconds: BASE_TS,
};
export const USDT_DATA_POINT: DataPackagesResponseInput = {
  dataFeedId: "USDT",
  value: USDT_PRICE,
  timestampMilliSeconds: BASE_TS,
};

export function makeDataPackagesResponse(input: DataPackagesResponseInput[]) {
  const signedDataPackages = makeSignedDataPackagesObjects(input);

  return Object.fromEntries(
    signedDataPackages.map((dp) => [dp.dataPackageId, [SignedDataPackage.fromObj(dp)]])
  ) as DataPackagesResponse;
}

function makeSignedDataPackagesObjects(
  input: DataPackagesResponseInput[]
): SignedDataPackagePlainObj[] {
  return input.map((entry) => ({
    dataPoints: [{ dataFeedId: entry.dataFeedId, value: entry.value }],
    timestampMilliseconds: entry.timestampMilliSeconds,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataPackageId: entry.dataFeedId,
  }));
}

export function later(dataPoint: DataPackagesResponseInput, by = LATER_TS) {
  return { ...dataPoint, timestampMilliSeconds: dataPoint.timestampMilliSeconds + by };
}

export const mockRequestParams = {
  dataServiceId: "redstone-primary-prod",
  dataPackagesIds: ["ETH", "BTC", "USDT"],
  uniqueSignersCount: 2,
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  ignoreMissingFeed: true,
};

export class MockStrategyDelegate implements MqttDataProcessingStrategyDelegate<void> {
  readonly logger = console;

  constructor() {}

  async strategyRunIteration(_strategy: MqttDataProcessingStrategy<void>) {
    await RedstoneCommon.sleep(SINGLE_RUN_MS);
  }
}
