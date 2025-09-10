import { execSync } from "child_process";
import "dotenv/config";
import { setTimeout } from "timers/promises";
import { readCluster } from "../src";
import { buildCmd } from "./commands";
import { readProgramAddress } from "./consts";
import { readDeployDir } from "./utils";

const IS_VERIFIABLE: boolean = true; // Docker is needed for verifiable builds
const IS_UPGRADE: boolean = true;
const WITH_BUILD: boolean = true;

async function deploy(address: string, deployDir = readDeployDir(), cluster = readCluster()) {
  const { cmd } = await buildCmd({
    withBuild: WITH_BUILD,
    isVerifiable: IS_VERIFIABLE,
    withDeploy: IS_UPGRADE ? "upgrade" : "deploy",
    programAddress: address,
    deployDir,
    cluster,
  });

  execSync(cmd, {
    stdio: ["inherit", "inherit", "inherit"],
  });
}

async function main() {
  await deploy(readProgramAddress(readCluster()));

  await setTimeout(15_000); // wait 15 seconds before continuing
}

void main();
