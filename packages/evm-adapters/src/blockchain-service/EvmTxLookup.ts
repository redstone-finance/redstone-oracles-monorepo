import {
  BlockWithTransactions,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import { ErrorCode } from "@ethersproject/logger";
import {
  getFunctionSignature,
  normalizeRedStoneTxData,
  RangeScanTxLookup,
  TxLookupAddresses,
} from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { expandUserOpTxs, extractUserOpReceipt, isUserOpTx } from "./erc4337-utils";
import { parseLogEvent } from "./event-utils";
import { extractTopUpEntries, Multicall3Config } from "./extract-top-ups";
import { BlockWithTipPercentiles, fillTipPercentiles } from "./fill-tip-percentiles";

const RPC_CALL_BATCH_SIZE = 100;
const RPC_CALL_MS_BETWEEN_BATCHES = 1000;

const BLACKLISTED_FUNCTION_SIGNATURES = [
  "0xf7a57904", // MegaEth Transfer
];

const logger = loggerFactory("evm-tx-lookup");

export class EvmTxLookup extends RangeScanTxLookup<BlockWithTipPercentiles> {
  constructor(
    private readonly provider: providers.Provider,
    private readonly multicall3?: Multicall3Config
  ) {
    super();
  }

  protected override async fetchItemsInRange(startBlock: number, endBlock: number) {
    const blockPromises: (() => Promise<BlockWithTransactions>)[] = [];
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      blockPromises.push(() => this.fetchBlockResilient(blockNumber));
    }
    const blocks = await RedstoneCommon.batchPromises(
      RPC_CALL_BATCH_SIZE,
      RPC_CALL_MS_BETWEEN_BATCHES,
      blockPromises,
      true
    );

    return blocks.map(fillTipPercentiles);
  }

  private async fetchBlockResilient(blockNumber: number) {
    try {
      return await this.provider.getBlockWithTransactions(blockNumber);
    } catch (e) {
      if (!RedstoneCommon.isEthersError(e) || e.code !== ErrorCode.INVALID_ARGUMENT) {
        throw e;
      }

      try {
        const block = await this.provider.getBlock(blockNumber);

        if (block.transactions.length === 1) {
          // If there's only one transaction, and that's a RedStone tx, it's parseable
          return <BlockWithTransactions>{ ...block, transactions: [] };
        }

        logger.warn(
          `Block ${blockNumber} has unparseable txs - that's probably ok for TEMPO networks; falling back to per-tx fetch: ${RedstoneCommon.stringifyError(e)}`
        );

        const settled = await Promise.allSettled(
          block.transactions.map((hash) => this.provider.getTransaction(hash))
        );
        const { results } = RedstoneCommon.splitSettlements(settled);
        const transactions = results.filter(RedstoneCommon.isDefined);

        return <BlockWithTransactions>{ ...block, transactions };
      } catch (e) {
        logger.error(`Failed to fetch block ${blockNumber}: ${RedstoneCommon.stringifyError(e)}`);

        throw e;
      }
    }
  }

  protected override async normalizeMany(
    blocks: BlockWithTipPercentiles[],
    addresses: TxLookupAddresses
  ) {
    const interesting = blocks.flatMap((b) => filterRedStoneTxs(b, addresses));
    const receipts = await fetchReceiptsBatched(this.provider, interesting);

    return interesting.flatMap((entry, i) => {
      const receipt = receipts[i];
      if (!receipt) {
        throw new Error(`Missing receipt for tx ${entry.tx.hash} in block ${entry.block.number}`);
      }
      const effectiveReceipt = isUserOpTx(entry.tx)
        ? extractUserOpReceipt(entry.tx, receipt)
        : receipt;

      return effectiveReceipt ? [buildNormalizedTx(entry, effectiveReceipt)] : [];
    });
  }

  protected override extractTopUps(blocks: BlockWithTipPercentiles[], wallets: Set<string>) {
    return Promise.resolve(
      blocks.flatMap((b) => extractTopUpEntries(b.block, lowercaseSet(wallets), this.multicall3))
    );
  }
}

interface InterestingTx {
  tx: TransactionResponse;
  block: BlockWithTransactions;
  tip?: bigint;
  tipPercentile?: number;
  blockTipPercentiles?: bigint[];
}

function filterRedStoneTxs(enriched: BlockWithTipPercentiles, addresses: TxLookupAddresses) {
  const { block, txTip, txTipPercentile, tipPercentiles } = enriched;

  const normalizedAddresses = {
    ...addresses,
    adapters: lowercaseSet(addresses.adapters),
    wallets: lowercaseSet(addresses.wallets),
  };

  return block.transactions
    .flatMap(expandUserOpTxs)
    .filter((tx) => looksLikeRedStone(tx, normalizedAddresses))
    .map(
      (tx) =>
        <InterestingTx>{
          tx,
          block,
          tip: txTip.get(tx.hash),
          tipPercentile: txTipPercentile.get(tx.hash),
          blockTipPercentiles: tipPercentiles,
        }
    );
}

function looksLikeRedStone(tx: TransactionResponse, addresses: TxLookupAddresses) {
  const to = tx.to?.toLowerCase();
  if (!to) {
    return false;
  }
  if (!addresses.adapters.has(to) && !addresses.wallets.has(to)) {
    return false;
  }
  if (BLACKLISTED_FUNCTION_SIGNATURES.includes(getFunctionSignature(tx))) {
    return false;
  }

  return normalizeRedStoneTxData(tx.data).endsWith(consts.REDSTONE_MARKER_HEX_PURE);
}

async function fetchReceiptsBatched(provider: providers.Provider, items: InterestingTx[]) {
  const promises = items.map(
    ({ tx }): (() => Promise<TransactionReceipt | null>) =>
      () =>
        provider.getTransactionReceipt(tx.hash)
  );

  return await RedstoneCommon.batchPromises(
    RPC_CALL_BATCH_SIZE,
    RPC_CALL_MS_BETWEEN_BATCHES,
    promises,
    true
  );
}

function buildNormalizedTx(entry: InterestingTx, receipt: TransactionReceipt) {
  const { tx, block, tip, tipPercentile, blockTipPercentiles } = entry;

  return {
    blockNumber: receipt.blockNumber,
    blockTimestamp: block.timestamp,
    hash: tx.hash,
    from: tx.from,
    to: tx.to ?? "",
    data: tx.data,
    gasLimit: tx.gasLimit.toString(),
    gasPrice: (tx.gasPrice ?? tx.maxFeePerGas ?? receipt.effectiveGasPrice).toString(),
    isFailed: receipt.status === 0,
    gasUsed: receipt.gasUsed.toNumber(),
    functionSignature: getFunctionSignature(tx),
    events: toEvents(receipt.logs),
    tip,
    tipPercentile,
    blockTipPercentiles,
  };
}

function toEvents(logs: providers.Log[]) {
  const entries = logs.map(parseLogEvent).filter(RedstoneCommon.isDefined);

  return Object.fromEntries(entries.map((entry) => [entry.feedId, entry]));
}

function lowercaseSet(addresses: Set<string>) {
  return new Set(Array.from(addresses, (address) => address.toLowerCase()));
}
