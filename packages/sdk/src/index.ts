import { INumericDataPoint, SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import { default as redstoneOraclesInitialState } from "./registry/initial-state.json";

export const getDecimalsForDataFeedId = (dataPackages: SignedDataPackagePlainObj[]) => {
  const firstDecimal = (dataPackages[0].dataPoints[0] as INumericDataPoint).decimals;
  const areAllDecimalsEqual = dataPackages.every((dataPackage) =>
    dataPackage.dataPoints.every(
      (dataPoint) => (dataPoint as INumericDataPoint).decimals === firstDecimal
    )
  );

  if (!areAllDecimalsEqual) {
    throw new Error("Decimals from data points in data packages are not equal");
  }
  return firstDecimal;
};

export * from "./contracts/ContractData";
export * from "./contracts/ContractParamsProvider";
export * from "./contracts/ContractParamsProviderMock";
export * from "./contracts/IContractConnector";
export * from "./contracts/prices/IPriceFeedContractAdapter";
export * from "./contracts/prices/IPricesContractAdapter";
export * from "./contracts/prices/sample-run";
export * from "./data-feed-values";
export * from "./data-services-urls";
export * from "./DataPackagesResponseCache";
export * from "./oracle-registry";
export * from "./pick-closest-to-median";
export * from "./request-data-packages";
export * from "./request-data-packages-common";
export * from "./request-redstone-payload";
export { redstoneOraclesInitialState };
