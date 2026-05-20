import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { MoveClient } from "./MoveClient";
import { parseMoveWritePriceTx } from "./MoveTxParsing";

const MICROSECS_PER_SEC = 1_000_000n;
const logger = loggerFactory("movement-tx-lookup");

export class MovementTxLookup implements TxLookup {
  constructor(private readonly client: MoveClient) {}

  async fetchPage({ adapterContractPackageId, startBlock, endBlock }: TxLookupArgs) {
    if (!adapterContractPackageId) {
      throw new Error("MovementTxLookup requires adapterContractPackageId in manifest");
    }

    const data: ReturnType<typeof parseMoveWritePriceTx>[] = [];

    for (let blockHeight = startBlock; blockHeight <= endBlock; blockHeight++) {
      const block = await this.tryGetBlock(blockHeight);
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

    return {
      data: data.filter((tx): tx is NonNullable<typeof tx> => tx !== undefined),
      hasNextPage: false,
    };
  }

  private async tryGetBlock(blockHeight: number) {
    try {
      return await this.client.getMultiAptos().getBlockByHeight({
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
}
