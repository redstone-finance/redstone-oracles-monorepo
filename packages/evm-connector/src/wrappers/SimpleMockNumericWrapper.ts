import { Contract } from "@ethersproject/contracts";
import { DataPackage, INumericDataPoint, NumericDataPoint } from "@redstone-finance/protocol";
import packageJson from "../../package.json" with { type: "json" };
import {
  DEFAULT_TIMESTAMP_FOR_TESTS,
  MAX_MOCK_SIGNERS_COUNT,
  MockSignerIndex,
  getMockSignerAddress,
} from "../helpers/test-utils.js";
import { MockDataPackageConfig, MockWrapper } from "./MockWrapper.js";

export interface SimpleNumericMockConfig {
  mockSignersCount: number;
  timestampMilliseconds?: number;
  dataPoints: INumericDataPoint[];
}

export class SimpleNumericMockWrapper<T extends Contract> extends MockWrapper<T> {
  constructor(simpleNumericMockConfig: SimpleNumericMockConfig) {
    if (simpleNumericMockConfig.mockSignersCount > MAX_MOCK_SIGNERS_COUNT) {
      throw new Error(`mockSignersCount should be <= ${MAX_MOCK_SIGNERS_COUNT}`);
    }

    // Prepare mock data packages configs
    const mockDataPackages: MockDataPackageConfig[] = [];
    for (
      let signerIndex = 0;
      signerIndex < simpleNumericMockConfig.mockSignersCount;
      signerIndex++
    ) {
      for (const dataPointObj of simpleNumericMockConfig.dataPoints) {
        const dataPoint = new NumericDataPoint(dataPointObj);
        const timestampMilliseconds =
          simpleNumericMockConfig.timestampMilliseconds ?? DEFAULT_TIMESTAMP_FOR_TESTS;
        const mockDataPackage: MockDataPackageConfig = {
          signer: getMockSignerAddress(signerIndex as MockSignerIndex),
          dataPackage: new DataPackage([dataPoint], timestampMilliseconds, "__MOCK__"),
        };
        mockDataPackages.push(mockDataPackage);
      }
    }

    super(mockDataPackages);
  }

  override getUnsignedMetadata(): string {
    return `${packageJson.version}#simple-numeric-mock`;
  }
}
