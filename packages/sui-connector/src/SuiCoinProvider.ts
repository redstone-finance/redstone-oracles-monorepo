import type { SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { signExecuteAndWait } from "./client/sign-execute-and-wait";
import type { SuiClient } from "./client/SuiClient";

const REDEEM_FUNDS_TARGET = "0x2::coin::redeem_funds";
const REDEEM_TX_GAS_BUDGET = MIST_PER_SUI / 100n;
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
    let sourceCoins: string[] | undefined = undefined;
    try {
      const coin = await this.getLatestReceivedCoin(
        keypair.getPublicKey().toSuiAddress(),
        minimumBalance,
        (coinsToPurge, addressBalance) => this.purge(coinsToPurge, addressBalance, keypair)
      );

      if (coin) {
        sourceCoins = [coin];
        this.logger.info(`Using coin ${coin} for reinitialization of the executor`);
      } else {
        this.logger.info(
          `No coin with balance greater than ${minimumBalance} available for executor reinitialization`
        );
      }
    } catch (e) {
      this.logger.warn(`Error fetching latest coin: ${RedstoneCommon.stringifyError(e)}`);
    }

    return sourceCoins;
  }

  private async purge(
    coinsToPurge: SuiClientTypes.Coin[][],
    addressBalance: bigint,
    keypair: Keypair
  ) {
    await this.redeemAddressBalance(addressBalance, keypair);

    if (!coinsToPurge.length) {
      return;
    }

    this.logger.log(`Purging ${RedstoneCommon.getNS(coinsToPurge.length, "set")} of coins...`);

    await RedstoneCommon.batchPromises(
      MERGE_COINS_BATCH_SIZE,
      MERGE_COINS_MS_BETWEEN_BATCHES,
      coinsToPurge.map((coins) => () => this.mergeCoins(coins, keypair))
    );
  }

  private async redeemAddressBalance(addressBalance: bigint, keypair: Keypair) {
    if (addressBalance <= REDEEM_TX_GAS_BUDGET) {
      return;
    }
    const client = MultiExecutor.createForSubInstances(this.client, (client) => client, {
      signAndExecute: MultiExecutor.ExecutionMode.FALLBACK,
    });

    this.logger.log(`Redeeming the address balance of ${addressBalance} MIST into a coin`);

    try {
      const tx = new Transaction();
      tx.setGasPayment([]);
      tx.setGasBudget(REDEEM_TX_GAS_BUDGET);
      tx.setExpiration(await this.client.getValidDuringExpiration());
      const [coin] = tx.moveCall({
        target: REDEEM_FUNDS_TARGET,
        typeArguments: [SUI_TYPE_ARG],
        arguments: [tx.withdrawal({ amount: addressBalance - REDEEM_TX_GAS_BUDGET })],
      });
      tx.transferObjects([coin], keypair.toSuiAddress());

      await signExecuteAndWait(client, tx, keypair);
    } catch (e) {
      this.logger.warn(RedstoneCommon.stringifyError(e));
    }
  }

  private async mergeCoins(coins: SuiClientTypes.Coin[], keypair: Keypair) {
    if (coins.length <= 1) {
      this.logger.log(`Not purging - not enough coins to purge in set`);

      return;
    }
    const client = MultiExecutor.createForSubInstances(this.client, (client) => client, {
      signAndExecute: MultiExecutor.ExecutionMode.FALLBACK,
    });

    this.logger.log(`Purging ${RedstoneCommon.getNS(coins.length, "coin")}`);

    try {
      this.logger.debug(`Merging ${coins.map((c) => c.objectId).toString()} `);

      const tx = new Transaction();
      tx.setGasPayment(
        coins.map((c) => ({
          objectId: c.objectId,
          version: c.version,
          digest: c.digest,
        }))
      );
      tx.transferObjects([tx.gas], keypair.toSuiAddress());

      await client.signAndExecute(tx, keypair);
    } catch (e) {
      this.logger.warn(RedstoneCommon.stringifyError(e));
    }
  }

  private async getLatestReceivedCoin(
    address: string,
    minBalance: bigint,
    purgeFun: (coins: SuiClientTypes.Coin[][], addressBalance: bigint) => Promise<void>,
    coinType = SUI_TYPE_ARG,
    txLimitCount = COIN_TRANSFER_TX_LOOKUP_COUNT_LIMIT
  ) {
    const { objectIds: receivedObjectIds } = await this.client.getReceivedCoinObjectIds({
      address,
      coinType,
      limit: txLimitCount,
    });

    const { coins, coinsToMerge } = await this.getCoinsWithSufficientBalance(
      address,
      minBalance,
      coinType
    );
    const addressBalance = await RedstoneCommon.retry({
      fn: () => this.client.getAddressBalance(address),
      ...RETRY_CONFIG,
    })();

    await purgeFun(coinsToMerge, addressBalance);

    if (coins.length === 0) {
      throw new Error(
        `Did not find any coin with sufficient balance for account: ${address}, balance: ${minBalance}`
      );
    }

    for (const objectId of receivedObjectIds) {
      const coin = coins.find((c) => c.objectId === objectId);

      if (coin && BigInt(coin.balance) >= minBalance) {
        return objectId;
      }
    }

    const masterCoin = _.maxBy(coins, (coin) => BigInt(coin.balance));

    return masterCoin?.objectId;
  }

  private async getCoinsWithSufficientBalance(
    address: string,
    minBalance: bigint,
    coinType: string
  ) {
    const coins: SuiClientTypes.Coin[] = [];
    const coinsToMerge: SuiClientTypes.Coin[][] = [];
    let cursor: string | null | undefined = null;
    let page = 0;

    do {
      this.logger.info(`Fetching coins of ${address}, page #${page}`);
      const { objects, cursor: nextCursor } = await RedstoneCommon.retry({
        fn: () =>
          this.client.listCoins({
            owner: address,
            cursor,
            coinType,
          }),
        ...RETRY_CONFIG,
      })();

      const [sufficient, insufficient] = _.partition(
        objects,
        (c) => BigInt(c.balance) > minBalance
      );

      coins.push(...sufficient);
      if (insufficient.length) {
        coinsToMerge.push(insufficient);
      }
      cursor = nextCursor;
      page += 1;
    } while (cursor && (page < FETCH_COINS_PAGE_COUNT_LIMIT || !coins.length));

    return { coins, coinsToMerge };
  }
}
