import { Keypair, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import "dotenv/config";
import { makeConnection, readKeypair } from "../utils";
import { MULTI_SIG_PUBLIC_KEYS, THRESHOLD } from "./config";

const { Permissions } = multisig.types;

async function createMultiSig() {
  const connection = makeConnection();
  const creator = readKeypair();
  const createKey = Keypair.generate();

  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  const [programConfigPda] = multisig.getProgramConfigPda({});
  const programConfig =
    await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      programConfigPda
    );
  const configTreasury = programConfig.treasury;
  const members = MULTI_SIG_PUBLIC_KEYS.map((pk) => Buffer.from(pk, "hex"))
    .map((pk) => new PublicKey(pk))
    .map((pk) => ({
      key: pk,
      permissions: Permissions.all(),
    }));

  const signature = await multisig.rpc.multisigCreateV2({
    connection: connection,
    creator: creator,
    createKey: createKey,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members,
    threshold: THRESHOLD,
    rentCollector: null,
    treasury: configTreasury,
  });
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });

  console.log(creator.publicKey.toBase58());
  console.log("New squad pubkey: ", multisigPda);
  console.log("VaultPda : ", vaultPda);
  console.log("Multisig created: ", signature);
}

void createMultiSig();
