import {
  BlockWithTransactions,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import {
  getFunctionSignature,
  normalizeRedStoneTxData,
  RangeScanTxLookup,
  TxLookupAddresses,
} from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { parseLogEvent } from "./event-utils";
import { extractTopUpEntries, Multicall3Config } from "./extract-top-ups";
import { BlockWithTipPercentiles, fillTipPercentiles } from "./fill-tip-percentiles";

const RPC_CALL_BATCH_SIZE = 100;
const RPC_CALL_MS_BETWEEN_BATCHES = 1000;

const BLACKLISTED_FUNCTION_SIGNATURES = [
  "0xf7a57904", // MegaEth Transfer
];

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
      blockPromises.push(() => this.provider.getBlockWithTransactions(blockNumber));
    }
    const blocks = await RedstoneCommon.batchPromises(
      RPC_CALL_BATCH_SIZE,
      RPC_CALL_MS_BETWEEN_BATCHES,
      blockPromises,
      true
    );

    return blocks.map(fillTipPercentiles);
  }

  protected override async normalizeMany(
    blocks: BlockWithTipPercentiles[],
    addresses: TxLookupAddresses
  ) {
    const interesting = blocks.flatMap((b) => filterRedStoneTxs(b, addresses));
    const receipts = await fetchReceiptsBatched(this.provider, interesting);

    return interesting.map((entry, i) => {
      const receipt = receipts[i];
      if (!receipt) {
        throw new Error(`Missing receipt for tx ${entry.tx.hash} in block ${entry.block.number}`);
      }

      return buildNormalizedTx(entry, receipt);
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
