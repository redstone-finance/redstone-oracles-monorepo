import { Interface } from "@ethersproject/abi";
import { BlockWithTransactions, TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { Multicall3Abi, RedstoneMulticall3Abi } from "@redstone-finance/evm-multicall";
import type { NormalizedTopUpEntry } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";

const ZRODELKO_ADDRESS = "0x086863620790827b167a6e0bEc22D8314A032c11";

export interface Multicall3Config {
  address: string;
  type: "Multicall3" | "RedstoneMulticall3";
}

interface TopUpMulticallCalldata {
  calls: { target: string; value: BigNumber }[];
}

export function extractTopUpEntries(
  block: BlockWithTransactions,
  wallets: Set<string>,
  multicall3?: Multicall3Config
) {
  const multicallAddress = multicall3?.address.toLowerCase();
  const entries: NormalizedTopUpEntry[] = [];

  for (const tx of block.transactions.filter(isTopUpTx)) {
    const to = tx.to.toLowerCase();
    if (multicallAddress && to === multicallAddress && multicall3) {
      const multicallEntries = decodeMulticallTopUp(tx, block.timestamp, multicall3);
      for (const entry of multicallEntries) {
        if (wallets.has(entry.walletAddress.toLowerCase())) {
          entries.push(entry);
        }
      }
    } else if (wallets.has(to)) {
      entries.push({
        walletAddress: tx.to,
        sender: tx.from,
        value: tx.value.toBigInt(),
        blockTimestamp: block.timestamp,
      });
    }
  }

  return entries;
}

function isTopUpTx(tx: TransactionResponse): tx is TransactionResponse & { to: string } {
  return (
    tx.from.toLowerCase() === ZRODELKO_ADDRESS.toLowerCase() &&
    !tx.value.isZero() &&
    RedstoneCommon.isDefined(tx.to)
  );
}

function decodeMulticallTopUp(
  tx: TransactionResponse,
  blockTimestamp: number,
  multicall3: Multicall3Config
): NormalizedTopUpEntry[] {
  const abi = multicall3.type === "RedstoneMulticall3" ? RedstoneMulticall3Abi : Multicall3Abi;
  try {
    const decoded = new Interface(abi).decodeFunctionData(
      "aggregate3Value",
      tx.data
    ) as unknown as TopUpMulticallCalldata;

    return decoded.calls.map(({ target, value }) => ({
      walletAddress: target,
      sender: tx.from,
      value: value.toBigInt(),
      blockTimestamp,
    }));
  } catch {
    return [];
  }
}
