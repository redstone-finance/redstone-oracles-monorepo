import {
  Connection,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { type accounts } from "@sqds/multisig";
import "dotenv/config";
import fs from "fs";
import { BPF_UPGRADEABLE_LOADER } from "../consts";
import { SquadsMultisig } from "./multi-sig-utils";

function getProgramDataAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    BPF_UPGRADEABLE_LOADER
  )[0];
}

export function createUpgradeInstruction(
  payer: PublicKey,
  programId: PublicKey,
  bufferAddress: PublicKey,
  spillAccount: PublicKey
) {
  const programDataAddress = getProgramDataAddress(programId);

  /// # Account references
  ///   0. `[writable]` The ProgramData account.
  ///   1. `[writable]` The Program account.
  ///   2. `[writable]` The Buffer account where the program data has been
  ///      written.  The buffer account's authority must match the program's
  ///      authority
  ///   3. `[writable]` The spill account.
  ///   4. `[]` Rent sysvar.
  ///   5. `[]` Clock sysvar.
  ///   6. `[signer]` The program's authority.
  return new TransactionInstruction({
    programId: BPF_UPGRADEABLE_LOADER,
    keys: [
      { pubkey: programDataAddress, isWritable: true, isSigner: false },
      { pubkey: programId, isWritable: true, isSigner: false },
      { pubkey: bufferAddress, isWritable: true, isSigner: false },
      { pubkey: spillAccount, isWritable: true, isSigner: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: payer, isWritable: true, isSigner: true },
    ],
    data: Buffer.from([3, 0, 0, 0]), // Instruction tag: Upgrade (3)
  });
}

export async function checkUpgradeTransaction(
  connection: Connection,
  squads: SquadsMultisig,
  vaultTransaction: accounts.VaultTransaction,
  expectedBufferAccount: PublicKey,
  programBytesFile: string
) {
  const bytes = fs.readFileSync(programBytesFile);
  const bufferAccount = vaultTransaction.message.accountKeys.find(
    (key) => key.toBase58() === expectedBufferAccount.toBase58()
  );
  if (!bufferAccount) {
    throw new Error(
      `❌ Did not find buffer account ${expectedBufferAccount.toBase58()} in transaction keys.`
    );
  }

  console.log("✅ Expected buffer account in the transaction");

  console.log("Fetching buffer data to validate...");

  const accountData = await connection.getAccountInfo(expectedBufferAccount);

  const soLength = bytes.length;

  if (accountData === null) {
    throw new Error(`❌ Could not fetch buffer account info`);
  }
  const data = accountData.data;

  const soFileInBuffer = data.slice(data.length - soLength);

  if (Buffer.compare(soFileInBuffer, bytes) !== 0) {
    throw new Error(`❌ Buffer data is not the same as in file program`);
  }
  console.log(`✅ ${programBytesFile} bytes are at the end of the data`);

  if (data[0] !== 1) {
    throw new Error(`❌ Buffer account is not of type buffer, ${data[0]}`);
  }

  const authority = data.slice(
    data.length - soLength - 32,
    data.length - soLength
  );

  if (squads.vaultPda().toBase58() !== new PublicKey(authority).toBase58()) {
    throw new Error(`❌ VaultPda is not set to authority in the buffer data.`);
  }
  console.log(`✅ VaultPda is set to authority in the buffer data.`);

  console.log(`✅✅✅ Buffer account validated.`);
}
