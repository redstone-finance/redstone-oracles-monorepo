import { Contract } from "@ethersproject/contracts";
import { SignedDataPackage } from "@redstone-finance/protocol";
import { DataPackagesResponse } from "@redstone-finance/sdk";
import packageJson from "../../package.json" with { type: "json" };
import { BaseWrapper } from "./BaseWrapper.js";

export class DataPackagesWrapper<T extends Contract = Contract> extends BaseWrapper<T> {
  constructor(private readonly dataPackages: DataPackagesResponse) {
    super();
  }

  override getUnsignedMetadata(): string {
    return `${this.getMetadataTimestamp()}#${packageJson.version}#data-packages-wrapper`;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- add reason here, please
  override async getDataPackagesForPayload() {
    return Object.values(this.dataPackages).flat() as SignedDataPackage[];
  }
}
