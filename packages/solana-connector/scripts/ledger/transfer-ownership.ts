import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { BPF_UPGRADEABLE_LOADER } from "../consts";

export function createSetUpgradeAuthority(
  programId: PublicKey,
  upgradeAuthority: PublicKey,
  newUpgradeAuthority: PublicKey
) {
  const bpfUpgradableLoaderId = BPF_UPGRADEABLE_LOADER;

  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    bpfUpgradableLoaderId
  );

  const keys = [
    {
      pubkey: programDataAddress,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: upgradeAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: newUpgradeAuthority,
      isWritable: false,
      isSigner: false,
    },
  ];

  return new TransactionInstruction({
    keys,
    programId: bpfUpgradableLoaderId,
    data: Buffer.from([4, 0, 0, 0]), // SetAuthority instruction bincode
  });
}

export async function createSetUpgradeAuthorityTx(
  connection: Connection,
  programId: PublicKey,
  upgradeAuthority: PublicKey,
  newUpgradeAuthority: PublicKey,
  payer: PublicKey
) {
  const ix = createSetUpgradeAuthority(
    programId,
    upgradeAuthority,
    newUpgradeAuthority
  );

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [ix],
  });

  return new VersionedTransaction(message.compileToV0Message());
}
