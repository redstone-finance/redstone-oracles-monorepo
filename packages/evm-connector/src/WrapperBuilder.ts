import { Contract } from "@ethersproject/contracts";
import { DataPackagesResponse } from "@redstone-finance/sdk";
import { DataPackagesWrapper } from "./wrappers/DataPackagesWrapper.js";
import { DataPackagesRequestInput, DataServiceWrapper } from "./wrappers/DataServiceWrapper.js";
import { MockDataPackageConfig, MockWrapper } from "./wrappers/MockWrapper.js";
import {
  SimpleNumericMockConfig,
  SimpleNumericMockWrapper,
} from "./wrappers/SimpleMockNumericWrapper.js";

export class WrapperBuilder<T extends Contract> {
  constructor(private baseContract: T) {}

  static wrap<T extends Contract>(contract: T): WrapperBuilder<T> {
    return new WrapperBuilder(contract);
  }

  usingDataService(dataPackagesRequestInput: DataPackagesRequestInput): T {
    return new DataServiceWrapper<T>(dataPackagesRequestInput).overwriteEthersContract(
      this.baseContract
    );
  }

  usingMockDataPackages(mockDataPackages: MockDataPackageConfig[]): T {
    return new MockWrapper<T>(mockDataPackages).overwriteEthersContract(this.baseContract);
  }

  usingSimpleNumericMock(simpleNumericMockConfig: SimpleNumericMockConfig): T {
    return new SimpleNumericMockWrapper<T>(simpleNumericMockConfig).overwriteEthersContract(
      this.baseContract
    );
  }

  usingDataPackages(dataPackages: DataPackagesResponse) {
    return new DataPackagesWrapper<T>(dataPackages).overwriteEthersContract(this.baseContract);
  }
}
