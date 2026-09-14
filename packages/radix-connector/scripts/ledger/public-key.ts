import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { LedgerSigner } from "./ledger-utils";

// Run APTOS application
export async function publicKey() {
  const accountId = RedstoneCommon.getFromEnv("ACCOUNT_ID", z.number());
  const ledgerSigner = await LedgerSigner.makeLedgerSigner(accountId);
  const publicKey = await ledgerSigner.publicKey();
  console.log(RedstoneCommon.hexlify(publicKey.publicKey));
}

void publicKey();
