import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { RedstoneCommon } from "@redstone-finance/utils";
import { spawn } from "child_process";
import "dotenv/config";
import { rmSync } from "fs";
import { z } from "zod";
import {
  getDeployDir,
  makeSuiClient,
  makeSuiDeployConfig,
  makeSuiKeypair,
  saveIds,
  SuiAdapterContractOps,
  SuiNetworkName,
  SuiNetworkSchema,
} from "../src";

interface CliObjectChange {
  type: "published" | "created" | "mutated";
  objectId?: string;
  packageId?: string;
  objectType?: string;
}

interface CliTransactionResult {
  objectChanges?: CliObjectChange[];
}

async function executeCommand(command: string, args: string[]): Promise<string> {
  return await new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(` ${stdout} Process exited with code ${code}: ${stderr}`));
      }
    });
  });
}

async function executeSuiPublish(network: SuiNetworkName): Promise<CliTransactionResult> {
  const cwd = process.cwd();
  try {
    const skipFaucet = RedstoneCommon.getFromEnv("SKIP_FAUCET", z.optional(z.boolean()));
    if ((network === "localnet" || network === "testnet") && !skipFaucet) {
      await executeCommand("sui", ["client", "faucet"]);
      console.log("waiting for faucet drip");

      await RedstoneCommon.sleep(RedstoneCommon.secsToMs(3));
    }

    const deployDir = getDeployDir();
    console.log("===========================================================");
    console.log(`Deploying to ${network} from ${deployDir}`);
    console.log("===========================================================");
    process.chdir(deployDir);

    const cmd =
      network === "localnet"
        ? ["client", "test-publish", "--json", "--build-env", "localnet"]
        : ["client", "publish", "--json"];
    if (network !== "mainnet") {
      cmd.push("--skip-dependency-verification");
    }

    const output = await executeCommand("sui", cmd);
    console.log("Output:", output);

    const jsonStart = output.indexOf("{");
    const jsonEnd = output.lastIndexOf("}");

    const json = output.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(json.split("Transaction digest:")[0]) as CliTransactionResult;
  } catch (error) {
    console.error("Error executing sui client publish:", error);
    throw error;
  } finally {
    rmSync("Pub.localnet.toml");
    process.chdir(cwd);
  }
}

async function initialize(
  client: SuiGrpcClient,
  packageId: string,
  adminCap: string,
  networkName: SuiNetworkName
) {
  const tx = new Transaction();
  const minTime = networkName === "localnet" ? 0 : undefined;
  const config = makeSuiDeployConfig(undefined, networkName, minTime);
  const keypair = makeSuiKeypair();
  SuiAdapterContractOps.initialize(tx, config, packageId, adminCap);

  const result = await keypair.signAndExecuteTransaction({
    transaction: tx,
    client,
  });

  const txData = result.Transaction ?? result.FailedTransaction;
  if (result.$kind === "FailedTransaction") {
    throw new Error(`Transaction failed: ${RedstoneCommon.stringifyError(txData)}`);
  }

  return txData;
}

async function findCreatedObjectByType(client: SuiGrpcClient, digest: string, typeName: string) {
  const result = await client.core.getTransaction({
    digest,
    include: { effects: true },
  });

  const txData = result.Transaction ?? result.FailedTransaction;
  const createdIds = txData.effects.changedObjects
    .filter((obj) => obj.inputState === "DoesNotExist")
    .map((ref) => ref.objectId);

  const response = await client.core.getObjects({
    objectIds: createdIds,
  });

  return response.objects.find((obj) => (obj as { type?: string }).type?.includes(typeName));
}

function findCliCreatedObject(response: CliTransactionResult, objectType: string) {
  return response.objectChanges?.find(
    (obj) => obj.type === "created" && obj.objectType?.includes(objectType)
  )?.objectId;
}

function getAdminCap(response: CliTransactionResult, packageId: string) {
  return findCliCreatedObject(response, `${packageId}::admin::AdminCap`);
}

function getUpgradeCap(response: CliTransactionResult) {
  return findCliCreatedObject(response, "UpgradeCap");
}

function getPackageId(response: CliTransactionResult) {
  return response.objectChanges?.find((obj) => obj.type === "published")?.packageId;
}

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const client = makeSuiClient(network);

  const output = await executeCommand("sui", ["client", "active-env"]);
  if (!output.includes(network)) {
    throw new Error(
      `Not on ${network}, network is set to ${output}; Run "sui client switch --env ${network}"`
    );
  }

  const publicKey = await executeCommand("sui", ["client", "active-address"]);
  const keypairSuiAddress = makeSuiKeypair().toSuiAddress();
  if (!publicKey.includes(keypairSuiAddress)) {
    throw new Error(
      `Keypair address ${keypairSuiAddress} != from ${publicKey} sui cli; Run "sui client switch --address ${keypairSuiAddress}"`
    );
  }

  const publishResult = await executeSuiPublish(network);
  console.log(publishResult);

  const packageId = getPackageId(publishResult);
  if (!packageId) {
    throw new Error("Package ID not found");
  }

  console.log("Publish result:", publishResult);

  const adminCap = getAdminCap(publishResult, packageId);
  if (!adminCap) {
    throw new Error("Admin cap not found");
  }

  const upgradeCap = getUpgradeCap(publishResult);
  if (!upgradeCap) {
    throw new Error("Upgrade cap not found");
  }

  const txData = await initialize(client, packageId, adminCap, network);
  await client.core.waitForTransaction({ digest: txData.digest });
  console.log("PriceAdapter initialized:", txData);

  const priceAdapter = await findCreatedObjectByType(
    client,
    txData.digest,
    `${packageId}::price_adapter::PriceAdapter`
  );

  if (!priceAdapter || priceAdapter instanceof Error) {
    throw new Error("priceAdapterObjectId not found");
  }
  const priceAdapterObjectId = priceAdapter.objectId;

  const ids = {
    packageId,
    priceAdapterObjectId,
    adminCapId: adminCap,
    upgradeCapId: upgradeCap,
  };
  saveIds(ids, network);

  console.log(`PACKAGE_ID=${packageId}`);
  console.log(`ADAPTER_OBJECT_ID=${priceAdapterObjectId}`);
  console.log(`ADMINCAP_OBJECT_ID=${adminCap}`);
  console.log(`UPGRADECAP_OBJECT_ID=${upgradeCap}`);
}

void main();
