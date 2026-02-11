import { PaginatedTransactionResponse, SuiClient, SuiObjectChange } from "@mysten/sui/client";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";

const TX_LOOKUP_COUNT_LIMIT = 100;

export class SuiReader {
  constructor(private readonly client: SuiClient) {}

  async fetchObjectDataContent(
    input: { objectId: string; version?: number },
    blockNumber?: number
  ) {
    if (blockNumber) {
      let version = input.version;
      if (!version) {
        version = await this.findLatestVersionAtCheckpoint(input.objectId, blockNumber);

        if (!version) {
          throw new Error(`No version of ${input.objectId} found for ${blockNumber}`);
        }
      }

      const object = await this.client.tryGetPastObject({
        id: input.objectId,
        version,
        options: { showContent: true },
      });

      if (object.status !== "VersionFound") {
        throw new Error(`Failed to find past object: ${RedstoneCommon.stringify(object)}`);
      }

      if (!object.details.content) {
        throw new Error("Object details not found or have no content");
      }

      return object.details.content;
    }

    const object = await this.client.getObject({
      id: input.objectId,
      options: { showContent: true },
    });

    if (!object.data?.content) {
      throw new Error("Object not found or has no content");
    }

    return object.data.content;
  }

  async getObjectIds(pricesTableId: string) {
    const dynamicFields = await this.client.getDynamicFields({
      parentId: pricesTableId,
    });
    if (dynamicFields.data.length === 0) {
      return [];
    }

    return dynamicFields.data.map((field) => ({
      objectId: field.objectId,
      version: Number(field.version),
    }));
  }

  async getLatestReceivedCoin(
    address: string,
    minBalance: bigint,
    purgeFun: (address: string[][]) => Promise<void>,
    coinType = SUI_TYPE_ARG,
    txLimitCount = TX_LOOKUP_COUNT_LIMIT
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

    await purgeFun(coinsToMerge.map((coins) => coins.map((coin) => coin.coinObjectId)));

    if (coins.length === 0) {
      throw new Error(
        `Did not find any coin with sufficient balance for account: ${address}, balance: ${minBalance}`
      );
    }

    for (const tx of txs.data) {
      const receivedCoin = tx.objectChanges?.find((change) =>
        SuiReader.isReceivedCoin(change, coinType, address)
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

  async getCoinsWithSufficientBalance(address: string, minBalance: bigint, coinType: string) {
    const maxPagesToFetch = 10;
    const coins = [];
    const coinsToMerge = [];
    let cursor = null;
    let page = 0;

    do {
      const { data, nextCursor, hasNextPage } = await this.client.getCoins({
        owner: address,
        coinType,
        cursor,
      });

      const [sufficient, insufficient] = _.partition(data, (c) => BigInt(c.balance) > minBalance);

      coins.push(...sufficient);
      if (insufficient.length) {
        coinsToMerge.push(insufficient);
      }
      cursor = hasNextPage ? nextCursor : null;
      page += 1;
    } while (cursor && (page <= maxPagesToFetch || !coins.length));

    return { coins, coinsToMerge };
  }

  private async findLatestVersionAtCheckpoint(objectId: string, checkpointNumber: number) {
    await RedstoneCommon.waitForBlockNumber(
      () => this.client.getLatestCheckpointSequenceNumber().then(Number),
      checkpointNumber,
      `findLatestVersion ${objectId} at ${checkpointNumber}`
    );

    let cursor = undefined;
    do {
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          ChangedObject: objectId,
        },
        options: {
          showObjectChanges: true,
        },
        cursor,
      });

      const result = SuiReader.checkPage(transactions, checkpointNumber, objectId);

      if (result) {
        return result;
      }

      cursor = transactions.nextCursor;
    } while (cursor);

    return undefined;
  }

  static checkPage(
    transactions: PaginatedTransactionResponse,
    checkpointNumber: number,
    objectId: string
  ) {
    for (const tx of transactions.data) {
      if (Number(tx.checkpoint) <= checkpointNumber) {
        const objectChange = tx.objectChanges?.find(
          (change) => "objectId" in change && change.objectId === objectId
        );
        if (objectChange !== undefined) {
          return Number(objectChange.version);
        }
      }
    }

    return undefined;
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
