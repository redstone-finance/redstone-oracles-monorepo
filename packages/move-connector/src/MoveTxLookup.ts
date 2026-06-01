import { TransactionResponse } from "@aptos-labs/ts-sdk";
import {
  NormalizedContractTx,
  RangeScanTxLookup,
  TxLookupAddresses,
} from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  MICROSECS_PER_SEC,
  RPC_CALL_BATCH_SIZE,
  RPC_CALL_MS_BETWEEN_BATCHES,
} from "./lookup-tx-common";
import { MoveClient } from "./MoveClient";
import { parseMoveWritePriceTx } from "./MoveTxParsing";

const logger = loggerFactory("move-tx-lookup");

interface MoveTxItem {
  tx: TransactionResponse;
  blockHeight: number;
  blockTimestamp: number;
}

export class MoveTxLookup extends RangeScanTxLookup<MoveTxItem> {
  constructor(private readonly client: MoveClient) {
    super();
  }

  protected async fetchItemsInRange(startBlock: number, endBlock: number) {
    const heights = Array.from({ length: endBlock - startBlock + 1 }, (_, i) => startBlock + i);

    const blocks = await RedstoneCommon.batchPromises(
      RPC_CALL_BATCH_SIZE,
      RPC_CALL_MS_BETWEEN_BATCHES,
      heights.map((blockHeight) => () => tryGetBlock(this.client, blockHeight)),
      true
    );

    const items: MoveTxItem[] = [];
    blocks.forEach((block, i) => {
      if (!block?.transactions) {
        return;
      }
      const blockTimestamp = Number(BigInt(block.block_timestamp) / MICROSECS_PER_SEC);
      for (const tx of block.transactions) {
        items.push({ tx, blockHeight: heights[i], blockTimestamp });
      }
    });

    return items;
  }

  protected override normalizeMany(items: MoveTxItem[], addresses: TxLookupAddresses) {
    if (!addresses.packageIds.size) {
      throw new Error("move-tx-lookup requires adapterContractPackageId in manifest");
    }

    const data: NormalizedContractTx[] = [];
    for (const { tx, blockHeight, blockTimestamp } of items) {
      for (const packageId of addresses.packageIds) {
        const parsed = parseMoveWritePriceTx(tx, packageId, blockHeight, blockTimestamp);
        if (parsed) {
          data.push(parsed);
          break;
        }
      }
    }

    return Promise.resolve(data);
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
