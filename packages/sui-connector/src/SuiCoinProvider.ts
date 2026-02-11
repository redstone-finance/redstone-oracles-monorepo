import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiReader } from "./SuiReader";

const MERGE_COINS_BATCH_SIZE = 1;
const MERGE_COINS_MS_BETWEEN_BATCHES = 0;

export class SuiCoinProvider {
  protected readonly logger = loggerFactory("sui-coin-provider");

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    private readonly suiReader: SuiReader
  ) {}

  async getSourceCoins(minimumBalance: bigint) {
    let sourceCoins = undefined;
    try {
      const coin = await this.suiReader.getLatestReceivedCoin(
        this.keypair.getPublicKey().toSuiAddress(),
        minimumBalance,
        (coinsToPurge) => this.purge(coinsToPurge)
      );

      if (coin) {
        sourceCoins = [coin];
        this.logger.info(`Using coin ${coin} for reinitialization of the executor`);
      } else {
        this.logger.warn(
          `Error fetching latest coin: no coin or no coin has balance greater than: ${minimumBalance}`
        );
      }
    } catch (e) {
      this.logger.warn(`Error fetching latest coin: ${RedstoneCommon.stringifyError(e)}`);
    }
    return sourceCoins;
  }

  private async purge(coinsToPurge: string[][]) {
    if (!coinsToPurge.length) {
      return;
    }

    this.logger.log(
      `Purging ${coinsToPurge.length} set${RedstoneCommon.getS(coinsToPurge.length)} of coins...`
    );

    await RedstoneCommon.batchPromises(
      MERGE_COINS_BATCH_SIZE,
      MERGE_COINS_MS_BETWEEN_BATCHES,
      coinsToPurge.map((coins) => () => this.mergeCoins(coins))
    );
  }

  private async mergeCoins(coinIds: string[]) {
    if (coinIds.length > 1) {
      const client = MultiExecutor.createForSubInstances(this.client, (client) => client, {
        signAndExecuteTransaction: MultiExecutor.ExecutionMode.FALLBACK,
      });

      this.logger.log(`Purging ${coinIds.length} coin${RedstoneCommon.getS(coinIds.length)}`);

      try {
        const tx = new Transaction();
        tx.mergeCoins(
          tx.gas,
          coinIds.map((id) => tx.object(id))
        );

        await client.signAndExecuteTransaction({ transaction: tx, signer: this.keypair });
      } catch (e) {
        this.logger.warn(RedstoneCommon.stringifyError(e));
      }
    } else {
      this.logger.log(`Not purging - not enough coins to purge in set`);
    }
  }
}
