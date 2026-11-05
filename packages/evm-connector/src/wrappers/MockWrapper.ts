import { Contract } from "@ethersproject/contracts";
import { DataPackage, SignedDataPackage } from "@redstone-finance/protocol";
import packageJson from "../../package.json" with { type: "json" };
import { MockSignerAddress, getMockSignerPrivateKey } from "../helpers/test-utils.js";
import { BaseWrapper } from "./BaseWrapper.js";

export interface MockDataPackageConfig {
  signer: MockSignerAddress;
  dataPackage: DataPackage;
}

export class MockWrapper<T extends Contract> extends BaseWrapper<T> {
  constructor(private readonly mockDataPackages: MockDataPackageConfig[]) {
    super();
  }

  override getUnsignedMetadata(): string {
    return `${packageJson.version}#mock`;
  }

  // This function is async, because it's async in BaseWrapper
  // eslint-disable-next-line @typescript-eslint/require-await -- add reason here, please
  override async getDataPackagesForPayload() {
    const signedDataPackages: SignedDataPackage[] = [];

    for (const mockDataPackage of this.mockDataPackages) {
      const privateKey = getMockSignerPrivateKey(mockDataPackage.signer);
      const signedDataPackage = mockDataPackage.dataPackage.sign(privateKey);
      signedDataPackages.push(signedDataPackage);
    }

    return signedDataPackages;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this, @typescript-eslint/require-await -- add reason here, please
  async dryRunToVerifyPayload(payloads: string[]): Promise<string> {
    return payloads[0];
  }
}
