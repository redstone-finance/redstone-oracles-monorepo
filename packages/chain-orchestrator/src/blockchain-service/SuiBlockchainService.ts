import { SuiClient, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { SuiContractConnector } from "@redstone-finance/sui-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

export class SuiBlockchainService extends NonEvmBlockchainService {
  constructor(
    private client: SuiClient,
    keypair?: Keypair
  ) {
    super(new SuiContractConnector(client, keypair));
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
