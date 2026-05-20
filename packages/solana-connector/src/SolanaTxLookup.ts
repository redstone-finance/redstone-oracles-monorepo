import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { VersionedTransactionResponse } from "@solana/web3.js";
import { hexlify } from "ethers/lib/utils";
import { SolanaClient } from "./client/SolanaClient";

const COMPUTE_UNIT_LOG_REGEX = /consumed \d+ of (\d+) compute units/;
const GAS_PRICE_FEE_NORM = 10 ** (18 - 9); // normalized to 18 digits, Lamports are in 9 digits

export class SolanaTxLookup implements TxLookup {
  constructor(private readonly client: SolanaClient) {}

  async fetchPage({ adapterContract, startBlock, endBlock }: TxLookupArgs) {
    const raw = await this.client.getTransactions(startBlock, endBlock, [adapterContract]);
    const txs = raw.filter((tx): tx is VersionedTransactionResponse => tx !== null);

    const data = txs
      .flatMap((tx) => SolanaTxLookup.normalize(tx))
      .sort((a, b) => a.blockNumber - b.blockNumber);

    return { data, hasNextPage: false };
  }

  private static normalize(tx: VersionedTransactionResponse) {
    const instruction = tx.transaction.message.compiledInstructions.find((i) =>
      hexlify(i.data).endsWith(consts.REDSTONE_MARKER_HEX_PURE)
    );
    if (!instruction) {
      return [];
    }

    const fee = Number(tx.meta?.fee ?? 0);
    const computeUnits = Number(tx.meta?.computeUnitsConsumed ?? 1);
    const gasPrice = String(Math.floor((fee * GAS_PRICE_FEE_NORM) / Math.max(computeUnits, 1)));

    return [
      {
        blockNumber: tx.slot,
        blockTimestamp: tx.blockTime ?? 0,
        hash: tx.transaction.signatures[0],
        from: tx.transaction.message.staticAccountKeys[0].toBase58(),
        to: tx.transaction.message.staticAccountKeys[instruction.programIdIndex].toBase58(),
        data: Buffer.from(instruction.data).toString("hex"),
        gasLimit: String(extractGasLimit(tx.meta?.logMessages ?? [])),
        gasPrice,
        isFailed: !!tx.meta?.err,
        gasUsed: computeUnits,
      },
    ];
  }
}

function extractGasLimit(logMessages: string[]) {
  for (const log of logMessages) {
    const match = COMPUTE_UNIT_LOG_REGEX.exec(log);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 0;
}
