import { Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import crypto from "crypto";
import "dotenv/config";
import { SquadsMultisig } from "../ledger/multi-sig-utils";
import { addressNameMap } from "./address-book";
import { InstructionLog, parseIx } from "./parse-ix";

function prettyPrintLog(log: InstructionLog, indent = 0): string {
  const pad = "  ".repeat(indent);
  const detailLines = Object.entries(log.details)
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    .map(([key, value]) => `${pad}  ${key}: ${value}`)
    .join("\n");
  const innerLines =
    log.inner?.map((i) => prettyPrintLog(i, indent + 1)).join("\n") || "";
  return `${pad}${log.type}:\n${detailLines}${innerLines ? "\n" + innerLines : ""}`;
}

export async function parseTransaction(
  tx: VersionedTransaction,
  connection: Connection,
  squadUtils: SquadsMultisig
) {
  const book = addressNameMap("mainnet-beta");
  const log = await parseIx(
    connection,
    squadUtils,
    book,
    Buffer.from([...tx.message.compiledInstructions[0].data]),
    tx.message.compiledInstructions[0].programIdIndex,
    tx.message.compiledInstructions[0].accountKeyIndexes,
    tx.message.staticAccountKeys
  );

  console.log(`=========================================================`);
  console.log(prettyPrintLog(log));
  console.log(`=========================================================`);
  console.log(
    `Tx to sign: ${bs58.encode(crypto.createHash("sha256").update(tx.message.serialize()).digest())}`
  );
  console.log(`=========================================================`);
}
