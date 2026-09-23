import type { Keypair } from "@mysten/sui/cryptography";
import type { Transaction } from "@mysten/sui/transactions";
import { RedstoneCommon } from "@redstone-finance/utils";
import type { SuiClient } from "./SuiClient";

export async function signExecuteAndWait(client: SuiClient, tx: Transaction, keypair: Keypair) {
  const result = await client.signAndExecute(tx, keypair);

  if (result.$kind === "FailedTransaction") {
    throw new Error(
      `Transaction failed, ${RedstoneCommon.stringifyError(result.FailedTransaction)}`
    );
  }

  const txResult = result.Transaction;
  RedstoneCommon.assert(
    txResult.effects.status.success,
    `Transaction ${txResult.digest} aborted on chain: ${RedstoneCommon.stringifyError(txResult.effects.status.error)}`
  );
  RedstoneCommon.assert(
    await client.waitForTransaction(txResult.digest),
    `Transaction ${txResult.digest} was not confirmed`
  );

  return txResult;
}
