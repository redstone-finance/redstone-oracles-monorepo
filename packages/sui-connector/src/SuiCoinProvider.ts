import { CoinStruct, SuiClient, SuiObjectChange } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";

const MERGE_COINS_BATCH_SIZE = 1;
const MERGE_COINS_MS_BETWEEN_BATCHES = 0;
const COIN_TRANSFER_TX_LOOKUP_COUNT_LIMIT = 100;
const FETCH_COINS_PAGE_COUNT_LIMIT = 10;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 500,
};

export class SuiCoinProvider {
  protected readonly logger = loggerFactory("sui-coin-provider");

  constructor(private readonly client: SuiClient) {}

  async getSourceCoins(minimumBalance: bigint, keypair: Keypair) {
    let sourceCoins = undefined;
    try {
      const coin = await this.getLatestReceivedCoin(
        keypair.getPublicKey().toSuiAddress(),
        minimumBalance,
        (coinsToPurge) => this.purge(coinsToPurge, keypair)
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

  private async purge(coinsToPurge: CoinStruct[][], keypair: Keypair) {
    if (!coinsToPurge.length) {
      return;
    }

    this.logger.log(
      `Purging ${coinsToPurge.length} set${RedstoneCommon.getS(coinsToPurge.length)} of coins...`
    );

    await RedstoneCommon.batchPromises(
      MERGE_COINS_BATCH_SIZE,
      MERGE_COINS_MS_BETWEEN_BATCHES,
      coinsToPurge.map((coins) => () => this.mergeCoins(coins, keypair))
    );
  }

  private async mergeCoins(coins: CoinStruct[], keypair: Keypair) {
    if (coins.length > 1) {
      const client = MultiExecutor.createForSubInstances(this.client, (client) => client, {
        signAndExecuteTransaction: MultiExecutor.ExecutionMode.FALLBACK,
      });

      this.logger.log(`Purging ${coins.length} coin${RedstoneCommon.getS(coins.length)}`);

      try {
        this.logger.debug(`Merging ${coins.map((coin) => coin.coinObjectId).toString()} `);

        const tx = new Transaction();
        tx.setGasPayment(coins.map((coin) => ({ ...coin, objectId: coin.coinObjectId })));
        tx.transferObjects([tx.gas], keypair.toSuiAddress());

        await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
      } catch (e) {
        this.logger.warn(RedstoneCommon.stringifyError(e));
      }
    } else {
      this.logger.log(`Not purging - not enough coins to purge in set`);
    }
  }

  private async getLatestReceivedCoin(
    address: string,
    minBalance: bigint,
    purgeFun: (address: CoinStruct[][]) => Promise<void>,
    coinType = SUI_TYPE_ARG,
    txLimitCount = COIN_TRANSFER_TX_LOOKUP_COUNT_LIMIT
  ) {
    const txs = await this.client.queryTransactionBlocks({
      filter: { ToAddress: address },
      options: { showObjectChanges: true },
      order: "descending",
      limit: txLimitCount,
    });

    const { coins, coinsToMerge } = await this.getCoinsWithSufficientBalance(
      address,
      minBalance,
      coinType
    );

    await purgeFun(coinsToMerge);

    if (coins.length === 0) {
      throw new Error(
        `Did not find any coin with sufficient balance for account: ${address}, balance: ${minBalance}`
      );
    }

    for (const tx of txs.data) {
      const receivedCoin = tx.objectChanges?.find((change) =>
        SuiCoinProvider.isReceivedCoin(change, coinType, address)
      );

      if (!receivedCoin) {
        continue;
      }

      const coin = coins.find((c) => c.coinObjectId === receivedCoin.objectId);

      if (!coin) {
        continue;
      }

      if (BigInt(coin.balance) >= minBalance) {
        return receivedCoin.objectId;
      }
    }

    return undefined;
  }

  private async getCoinsWithSufficientBalance(
    address: string,
    minBalance: bigint,
    coinType: string
  ) {
    const coins = [];
    const coinsToMerge = [];
    let cursor: string | null | undefined = null;
    let page = 0;

    do {
      this.logger.info(`Fetching coins of ${address}, page #${page}`);
      const { data, nextCursor, hasNextPage } = await RedstoneCommon.retry({
        fn: () =>
          this.client.getCoins({
            owner: address,
            coinType,
            cursor,
          }),
        ...RETRY_CONFIG,
      })();

      const [sufficient, insufficient] = _.partition(data, (c) => BigInt(c.balance) > minBalance);

      coins.push(...sufficient);
      if (insufficient.length) {
        coinsToMerge.push(insufficient);
      }
      cursor = hasNextPage ? nextCursor : null;
      page += 1;
    } while (cursor && (page < FETCH_COINS_PAGE_COUNT_LIMIT || !coins.length));

    return { coins, coinsToMerge };
  }

  private static isReceivedCoin(
    change: SuiObjectChange,
    coinType: string,
    address: string
  ): change is Extract<SuiObjectChange, { type: "created" | "mutated" }> {
    if (change.type !== "created" && change.type !== "mutated") {
      return false;
    }

    if (!change.objectType.includes(coinType)) {
      return false;
    }

    if (typeof change.owner !== "object" || !("AddressOwner" in change.owner)) {
      return false;
    }

    return change.owner.AddressOwner === address;
  }
}
