import { execSync } from "child_process";
import "dotenv/config";
import { setTimeout } from "timers/promises";
import { readCluster } from "../src";
import { RDS_PROGRAM_ADDRESS } from "./consts";
import { getAccountInfo } from "./get-account-info";
import { CONTRACT_NAME, readDeployDir, readUrl } from "./utils";
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
      `https://github.com/redstone-finance/redstone-oracles-monorepo ` +
      `--mount-path packages/solana-connector/${deployDir} ` +
      `--library-name ${CONTRACT_NAME} ` +
      (cluster === "mainnet-beta" ? " --remote " : "") +
      `--keypair ${pkData.filename} ` +
      `-u  ${readUrl()} ` +
      `--program-id ${address} `,
  ];

  execSync(deployCmds.join(" && "), {
    stdio: ["inherit", "inherit", "inherit"],
  });
}

async function main() {
  await verifyProgram(RDS_PROGRAM_ADDRESS);

  await setTimeout(15_000); // wait 15 seconds before continuing
}

void main();
