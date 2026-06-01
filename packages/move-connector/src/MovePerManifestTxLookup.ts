import { TransactionResponse, TransactionResponseType } from "@aptos-labs/ts-sdk";
import {
  ManifestRef,
  NormalizedContractTx,
  PerManifestTxLookup,
} from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  MICROSECS_PER_SEC,
  RPC_CALL_BATCH_SIZE,
  RPC_CALL_MS_BETWEEN_BATCHES,
} from "./lookup-tx-common";
import { MoveClient } from "./MoveClient";
import { parseMoveWritePriceTx } from "./MoveTxParsing";

const INDEXER_PAGE_SIZE = 100;
const logger = loggerFactory("move-per-manifest-tx-lookup");

interface UserTransactionRef {
  version: string;
  block_height: string;
}

export class MovePerManifestTxLookup extends PerManifestTxLookup {
  constructor(private readonly client: MoveClient) {
    super();
  }

  protected override async fetchForManifest(
    manifest: ManifestRef,
    startBlock: number,
    endBlock: number,
    cursor?: string
  ) {
    const packageId = manifest.adapterContractPackageId;
    if (!packageId) {
      throw new Error("move-per-manifest-tx-lookup requires adapterContractPackageId in manifest");
    }

    const offset = cursor ? Number(cursor) : 0;
    const refs = await this.queryUserTransactions(packageId, startBlock, endBlock, offset);

    const txs = await RedstoneCommon.batchPromises(
      RPC_CALL_BATCH_SIZE,
      RPC_CALL_MS_BETWEEN_BATCHES,
      refs.map((ref) => () => tryGetTransactionByVersion(this.client, Number(ref.version))),
      true
    );

    const data: NormalizedContractTx[] = [];
    txs.forEach((tx, i) => {
      if (!tx) {
        return;
      }
      const parsed = parseMoveWritePriceTx(
        tx,
        packageId,
        Number(refs[i].block_height),
        blockTimestamp(tx)
      );
      if (parsed) {
        data.push(parsed);
      }
    });

    if (refs.length === INDEXER_PAGE_SIZE) {
      return { data, hasNextPage: true as const, nextCursor: String(offset + INDEXER_PAGE_SIZE) };
    }

    return { data, hasNextPage: false as const };
  }

  private async queryUserTransactions(
    packageId: string,
    startBlock: number,
    endBlock: number,
    offset: number
  ) {
    const query = `
      query TransactionsForAccountInBlockRange {
        user_transactions(
          where: {block_height: {_gte: "${startBlock}", _lte: "${endBlock}"}, entry_function_contract_address: {_eq: "${packageId}"}}
          order_by: { version: asc }
          limit: ${INDEXER_PAGE_SIZE}
          offset: ${offset}
        ) {
          block_height
          version
        }
      }
    `;

    const result = await this.client.getMultiAptos().queryIndexer<{
      user_transactions: UserTransactionRef[];
    }>({ query: { query } });

    return result.user_transactions;
  }
}

function blockTimestamp(tx: TransactionResponse) {
  if (tx.type !== TransactionResponseType.User) {
    return 0;
  }

  return Number(BigInt(tx.timestamp) / MICROSECS_PER_SEC);
}

async function tryGetTransactionByVersion(client: MoveClient, version: number) {
  try {
    return await client.getMultiAptos().getTransactionByVersion({ ledgerVersion: version });
  } catch (error) {
    logger.error(
      `Error while fetching transaction #${version}: ${RedstoneCommon.stringifyError(error)}`
    );

    return undefined;
  }
}
