import {
  ContractParamsProvider,
  getDataPackagesTimestamp,
  getResponseFeedIds,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, Tx } from "@redstone-finance/utils";

type MemoryTxDeliveryManContext = Tx.TxDeliveryManContext & {
  paramsProvider: ContractParamsProvider;
};

export class MemoryTxDeliveryMan implements Tx.ITxDeliveryMan {
  private readonly logger = loggerFactory("memory-tx-delivery-man");
  private readonly lastDeliveredTimestamp: { [feedId: string]: number | undefined } = {};

  constructor(private readonly expectedTxDeliveryTimeInMs: number) {}

  async deliver(_txDeliveryCall: Tx.TxDeliveryCall, context: MemoryTxDeliveryManContext) {
    const dataPackages = await context.paramsProvider.requestDataPackages();
    const timestamp = getDataPackagesTimestamp(dataPackages);
    const feedIds = getResponseFeedIds(dataPackages);

    this.logger.log(`Delivering timestamp=${timestamp} feeds=${feedIds.toString()}`);

    for (const feedId of feedIds) {
      if (timestamp <= (this.lastDeliveredTimestamp[feedId] ?? 0)) {
        throw new Error(
          `Data are not newer for ${feedId} (${timestamp} <= ${this.lastDeliveredTimestamp[feedId]})`
        );
      }
      this.lastDeliveredTimestamp[feedId] = timestamp;
    }

    const expectedTime = this.expectedTxDeliveryTimeInMs;
    await RedstoneCommon.sleep(
      Math.ceil(expectedTime / 2 + Math.pow(Math.random() * Math.sqrt(expectedTime), 2))
    );
  }
}
