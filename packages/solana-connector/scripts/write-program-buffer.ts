import { execSync } from "child_process";
import "dotenv/config";
import { readCluster } from "../src";
import { buildCmd } from "./commands";
import { makeSquads } from "./ledger/config";
import { readDeployDir } from "./utils";

const IS_VERIFIABLE: boolean = true; // Docker is needed for verifiable builds
const WITH_BUILD: boolean = true;

async function writeBuffer(
  deployDir = readDeployDir(),
  cluster = readCluster(),
  squads = makeSquads()
) {
  const { cmd, pkData, builtProgramPath } = await buildCmd(
    WITH_BUILD,
    IS_VERIFIABLE,
    "no",
    undefined,
    deployDir,
    cluster
  );

  execSync(cmd, {
    stdio: ["inherit", "inherit", "inherit"],
  });
  const writeCmds = [
    `cd ${deployDir}`,
    `solana program write-buffer ${builtProgramPath} --url ${cluster} --keypair ${pkData.filename} --output json`,
  ];

  const output = execSync(writeCmds.join(" && "), {
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf-8",
  });

  const bufferAddress = JSON.parse(output) as { buffer: string };

  const setAuthorityCmd = [
    `cd ${deployDir}`,
    `solana program set-buffer-authority ${bufferAddress.buffer} --new-buffer-authority ${squads.vaultPda().toBase58()} --url ${cluster} --keypair ${pkData.filename}`,
  ];
  execSync(setAuthorityCmd.join(" && "), {
    stdio: ["inherit", "inherit", "inherit"],
  });

  console.log(bufferAddress);
}

void writeBuffer();
