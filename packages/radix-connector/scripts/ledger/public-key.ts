import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { z } from "zod";
import { LedgerSigner } from "./ledger-utils";

// Run APTOS application
export async function publicKey() {
  const accountId = RedstoneCommon.getFromEnv("ACCOUNT_ID", z.number());
  const ledgerSigner = await LedgerSigner.makeLedgerSigner(accountId);
  const publicKey = await ledgerSigner.publicKey();
  console.log(hexlify(publicKey.publicKey));
}

void publicKey();
