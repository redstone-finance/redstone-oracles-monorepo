import { Transaction } from "@solana/web3.js";
import { execSync } from "child_process";
import "dotenv/config";
import { setTimeout } from "timers/promises";
import { readCluster } from "../../src";
import { readProgramAddress } from "../consts";
import { getAccountInfo } from "../get-account-info";
import { getSolanaVerifyBaseParams, readDeployDir } from "../utils";
import { writeKeypairToFile } from "../write-keypair-to-file";
import { makeSquads } from "./config";

async function verifyProgramAsMultiSig(
  address: string,
  deployDir = readDeployDir(),
  cluster = readCluster(),
  squads = makeSquads()
) {
  const pkData = writeKeypairToFile(deployDir);
  await getAccountInfo(pkData.publicKey, cluster);

  const uploader = `--uploader ${squads.vaultPda().toBase58()} `;
  const deployCmds = [
    `cd ${deployDir}`,
    `solana-verify export-pda-tx ` +
      getSolanaVerifyBaseParams(deployDir, address) +
      uploader +
      `--encoding base64`,
  ];

  const buffer = execSync(deployCmds.join(" && "), {
    stdio: ["inherit", "pipe", "inherit"],
  });

  console.log(buffer.toString("utf-8"));
  const buffers = buffer.toString("utf-8").split("\n");

  const tx = Transaction.from(
    Buffer.from(buffers[buffers.length - 2], "base64")
  );

  console.log("Instructions:", tx.instructions);

  console.log(
    "After confirming the transaction with Squads, run the following command:"
  );
  console.log(
    `solana-verify remote submit-job --program-id ${address} ${uploader}`
  );
}

async function main() {
  await verifyProgramAsMultiSig(readProgramAddress(readCluster()));

  await setTimeout(15_000); // wait 15 seconds before continuing
}

void main();
