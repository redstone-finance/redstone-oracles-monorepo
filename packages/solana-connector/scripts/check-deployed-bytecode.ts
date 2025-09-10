import { PublicKey } from "@solana/web3.js";
import { execSync } from "child_process";
import { join } from "path";
import { readCluster } from "../src";
import { buildCmd } from "./commands";
import { readProgramAddress } from "./consts";
import { makeSquads } from "./ledger/config";
import { checkProgramData, getProgramDataAddress } from "./ledger/upgrade-from-buffer";
import { makeConnection, readDeployDir } from "./utils";

async function main() {
  const deployDir = readDeployDir();
  const cluster = readCluster();
  const squads = makeSquads();
  const connection = makeConnection();

  const { cmd, builtProgramPath } = await buildCmd({
    withBuild: true,
    isVerifiable: true,
    withDeploy: "no",
    programAddress: undefined,
    deployDir,
    cluster,
  });

  execSync(cmd, {
    stdio: ["inherit", "inherit", "inherit"],
  });

  await checkProgramData(
    connection,
    getProgramDataAddress(new PublicKey(readProgramAddress(cluster))),
    squads,
    join(deployDir, builtProgramPath)
  );
}

void main();
