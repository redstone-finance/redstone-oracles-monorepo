import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { loggerFactory } from "@redstone-finance/utils";
import { MoveClient } from "./MoveClient";
import { parseMoveWritePriceTx } from "./MoveTxParsing";

const logger = loggerFactory("aptos-tx-lookup");
const MICROSECS_PER_SEC = 1_000_000;

export class AptosTxLookup implements TxLookup {
  constructor(private readonly client: MoveClient) {}

  async fetchPage({ adapterContractPackageId, startBlock, endBlock }: TxLookupArgs) {
    if (!adapterContractPackageId) {
      throw new Error("AptosTxLookup requires adapterContractPackageId in manifest");
    }

    const versions = await this.queryTransactionVersions(
      adapterContractPackageId,
      startBlock,
      endBlock
    );

    const fetched = await Promise.all(
      versions.user_transactions.map(async ({ version, block_height, timestamp }) => {
        const tx = await this.client.getMultiAptos().getTransactionByVersion({
          ledgerVersion: version,
        });

        return {
          tx,
          blockHeight: block_height,
          blockTimestamp: Math.floor(Number(timestamp) / MICROSECS_PER_SEC),
        };
      })
    );

    fetched.sort((a, b) => a.blockHeight - b.blockHeight);

    const data: ReturnType<typeof parseMoveWritePriceTx>[] = [];
    for (const { tx, blockHeight, blockTimestamp } of fetched) {
      const parsed = parseMoveWritePriceTx(
        tx,
        adapterContractPackageId,
        blockHeight,
        blockTimestamp
      );
      if (parsed) {
        data.push(parsed);
      }
    }

    return {
      data: data.filter((tx): tx is NonNullable<typeof tx> => tx !== undefined),
      hasNextPage: false,
    };
  }

  private async queryTransactionVersions(account: string, startBlock: number, endBlock: number) {
    const query = `
      query TransactionsForAccountInBlockRange {
        user_transactions(
          distinct_on: sequence_number
          where: {block_height: {_gte: "${startBlock}", _lte: "${endBlock}"}, entry_function_contract_address: {_eq: "${account}"}}
        ) {
          block_height
          version
          timestamp
        }
      }
    `;

    logger.debug(`Querying Aptos indexer for ${account} blocks [${startBlock}, ${endBlock}]`);

    return await this.client.getMultiAptos().queryIndexer<{
      user_transactions: { version: number; block_height: number; timestamp: string | number }[];
    }>({ query: { query } });
  }
}
