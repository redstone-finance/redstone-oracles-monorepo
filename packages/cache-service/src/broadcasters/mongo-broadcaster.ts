import { Injectable } from "@nestjs/common";
import { loggerFactory } from "@redstone-finance/utils";
import { CachedDataPackage, DataPackage } from "../data-packages/data-packages.model";
import { DataPackagesBroadcaster } from "./data-packages-broadcaster";

@Injectable()
export class MongoBroadcaster implements DataPackagesBroadcaster {
  private readonly logger = loggerFactory(MongoBroadcaster.name);

  async broadcast(dataPackages: CachedDataPackage[], _nodeEvmAddress: string): Promise<void> {
    await DataPackage.insertMany(dataPackages);
  }
}
