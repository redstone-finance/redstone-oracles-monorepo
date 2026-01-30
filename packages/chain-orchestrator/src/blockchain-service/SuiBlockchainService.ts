import { SuiClient, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { SuiBlockchainService as Service } from "@redstone-finance/sui-connector";
import { RedstoneCommon } from "@redstone-finance/utils";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

export class SuiBlockchainService {
  private readonly service: Service;

  constructor(private readonly client: SuiClient) {
    this.service = new Service(client);
  }

  async getBalance(addressOrName: string): Promise<bigint> {
    return await this.service.getNormalizedBalance(addressOrName);
  }

  async getBlockNumber() {
    return await this.service.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.service.waitForTransaction(txId);
  }

  async getNormalizedBalance(address: string) {
    return await this.service.getNormalizedBalance(address);
  }

  async getTimeForBlock(block: number): Promise<Date> {
    const checkpoint = await this.client.getCheckpoint({ id: String(block) });
    return new Date(Number(checkpoint.timestampMs));
  }

  async queryTransactionBlocks(
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ) {
    return await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: objectId },
          cursor: cursor,
          options,
        }),
    })();
  }
}
