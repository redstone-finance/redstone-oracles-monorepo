import { BlockWithTransactions, TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { RedstoneCommon } from "@redstone-finance/utils";

const PERCENTILE_QUANT_FACTOR = 100;

type RawTx = TransactionResponse;

export interface BlockWithTipPercentiles {
  block: BlockWithTransactions;
  baseFee?: bigint;
  txTip: Map<string, bigint>;
  txTipPercentile: Map<string, number>;
  tipPercentiles?: bigint[];
}

export function fillTipPercentiles(block: BlockWithTransactions): BlockWithTipPercentiles {
  const baseFee = block.baseFeePerGas?.toBigInt();
  if (!RedstoneCommon.isDefined(baseFee) || !block.transactions.length) {
    return { block, baseFee, txTip: new Map(), txTipPercentile: new Map() };
  }

  const txs = block.transactions.filter(isNonSystemTx);
  if (txs.length === 0) {
    return { block, baseFee, txTip: new Map(), txTipPercentile: new Map(), tipPercentiles: [] };
  }

  const txTip = new Map<string, bigint>();
  for (const tx of txs) {
    txTip.set(tx.hash, getTip(tx, baseFee));
  }

  const sortedTips = [...txTip.values()].sort((a, b) => Number(a > b) - Number(a < b));

  const tipPercentiles = Array.from({ length: PERCENTILE_QUANT_FACTOR }, (_, perc) =>
    getTipAtQuantile(sortedTips, (perc + 1) / PERCENTILE_QUANT_FACTOR)
  );

  const txTipPercentile = new Map<string, number>();
  for (const [hash, tip] of txTip) {
    txTipPercentile.set(
      hash,
      Math.floor(getTipQuantile(sortedTips, tip) * PERCENTILE_QUANT_FACTOR)
    );
  }

  return { block, baseFee, txTip, txTipPercentile, tipPercentiles };
}

function isNonSystemTx(tx: RawTx) {
  // megaEth system transactions have nonce = 0 & gasPrice = 0
  return (
    tx.type !== 126 && (tx.nonce !== 0 || (tx.gasPrice ?? BigNumber.from(0)).toBigInt() !== 0n)
  );
}

function getTipQuantile(sortedTips: bigint[], tip: bigint) {
  const below = sortedTips.filter((t) => t < tip).length;

  return below / sortedTips.length;
}

function getTipAtQuantile(sortedTips: bigint[], quantile: number) {
  const index = Math.ceil(quantile * sortedTips.length);

  return sortedTips[index - 1];
}

function getTip(tx: RawTx, baseFee: bigint) {
  return tx.maxPriorityFeePerGas?.toBigInt() ?? (tx.gasPrice?.toBigInt() ?? baseFee) - baseFee;
}
