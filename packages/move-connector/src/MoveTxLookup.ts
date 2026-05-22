import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { MoveClient } from "./MoveClient";
import { parseMoveWritePriceTx } from "./MoveTxParsing";

const MICROSECS_PER_SEC = 1_000_000n;
const logger = loggerFactory("move-tx-lookup");

export class MoveTxLookup implements TxLookup {
  constructor(private readonly client: MoveClient) {}

  async fetchPage({ adapterContractPackageId, startBlock, endBlock }: TxLookupArgs) {
    if (!adapterContractPackageId) {
      throw new Error("move-tx-lookup requires adapterContractPackageId in manifest");
    }
    const data: NonNullable<ReturnType<typeof parseMoveWritePriceTx>>[] = [];

    for (let blockHeight = startBlock; blockHeight <= endBlock; blockHeight++) {
      const block = await tryGetBlock(this.client, blockHeight);
      if (!block?.transactions) {
        continue;
      }

      const blockTimestamp = Number(BigInt(block.block_timestamp) / MICROSECS_PER_SEC);

      for (const tx of block.transactions) {
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
    }

    return { data, hasNextPage: false };
  }
}

async function tryGetBlock(client: MoveClient, blockHeight: number) {
  try {
    return await client.getMultiAptos().getBlockByHeight({
      blockHeight,
      options: { withTransactions: true },
    });
  } catch (error) {
    logger.error(
      `Error while fetching block #${blockHeight}: ${RedstoneCommon.stringifyError(error)}`
    );

    return undefined;
  }
}
