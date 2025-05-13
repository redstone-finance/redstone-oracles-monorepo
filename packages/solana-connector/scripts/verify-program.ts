import { execSync } from "child_process";
import "dotenv/config";
import { setTimeout } from "timers/promises";
import { readCluster } from "../src";
import { readProgramAddress } from "./consts";
import { getAccountInfo } from "./get-account-info";
import { getSolanaVerifyBaseParams, readDeployDir } from "./utils";
import { writeKeypairToFile } from "./write-keypair-to-file";

async function verifyProgram(
  address: string,
  deployDir = readDeployDir(),
  cluster = readCluster()
) {
  const pkData = writeKeypairToFile(deployDir);
  await getAccountInfo(pkData.publicKey, cluster);

  const deployCmds = [
    `cd ${deployDir}`,
    `solana-verify verify-from-repo --current-dir ` +
      getSolanaVerifyBaseParams(deployDir, address) +
      (cluster === "mainnet-beta" ? " --remote " : "") +
      `--keypair ${pkData.filename} ` +
      `--program-id ${address} `,
  ];

  execSync(deployCmds.join(" && "), {
    stdio: ["inherit", "inherit", "inherit"],
  });
}

async function main() {
  await verifyProgram(readProgramAddress(readCluster()));

  await setTimeout(15_000); // wait 15 seconds before continuing
}

void main();
