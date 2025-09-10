import { BN } from "@coral-xyz/anchor";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getNttProgram, NTT } from "@wormhole-foundation/sdk-solana-ntt";
import "dotenv/config";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, SQUAD_ADDRESS } from "./config";
import { makeSolana } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";

const NTT_ID = "NTtmvKU9dYM3hvKJq4tnrAkSRCqb82R6uTGkLUqY66K";
const INBOUD_LIMIT = 10000000001;
const OUTBOUD_LIMIT = 10000000231;

async function main(nttId: string, inboundLimit: number, outboundLimit: number) {
  const connection = makeConnection();
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);
  const squadUtils = new SquadsMultisig(SQUAD_ADDRESS, connection);
  const publicKey = (await solanaLedger.getPublicKey()).ed;

  const vaultPda = squadUtils.vaultPda();

  const programIdKey = new PublicKey(nttId);
  const program = getNttProgram(connection, nttId, "2.0.0");

  const [outboundLimitPublicKey] = PublicKey.findProgramAddressSync(
    [Buffer.from("outbox_rate_limit")],
    programIdKey
  );
  const [configPublicKey, _] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programIdKey
  );

  const outboundLimitInstruction = await program.methods
    .setOutboundLimit({ limit: new BN(outboundLimit) })
    .accounts({
      config: configPublicKey,
      owner: vaultPda,
      rateLimit: outboundLimitPublicKey,
    })
    .instruction();

  const inboundLimitInstruction = await NTT.setInboundLimit(program, {
    owner: vaultPda,
    chain: "Sepolia",
    limit: new BN(inboundLimit),
  });

  const pauseInstruction = await NTT.createSetPausedInstruction(program, {
    owner: vaultPda,
    paused: false,
  });

  const ix = await squadUtils.createVaultTransaction(
    publicKey,
    [outboundLimitInstruction, inboundLimitInstruction, pauseInstruction],
    undefined
  );

  const msg = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [ix],
  });

  const tx = new VersionedTransaction(msg.compileToV0Message());

  await solanaLedger.signTransaction(tx);

  console.log(await connection.sendTransaction(tx));
}

void main(NTT_ID, INBOUD_LIMIT, OUTBOUD_LIMIT);
