import {
  Account,
  AccountAddress,
  Aptos,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
} from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { MovementPackageTxBuilder } from "./package";
import {
  getPackageBytesToPublish,
  getPriceAdapterObjectAddress,
  handleTx,
  makeAptos,
  objectAddressForDeployment,
} from "./utils";

type NamedAddresses = { [p: string]: AccountAddress | undefined };

const OUTPUT_BUILD_DIR = "./movement/build/";
const PRICE_ADAPTER = "price_adapter";
const REDSTONE_SDK = "redstone_sdk";
const PRICE_FEED = "price_feed";

async function setUpDeploy(
  aptos: Aptos,
  account: Account,
  contractName: string,
  namedAddresses: NamedAddresses
) {
  const builder = new MovementPackageTxBuilder(aptos);
  const contractAddress = AccountAddress.fromString(
    await objectAddressForDeployment(aptos, account.accountAddress)
  );

  console.log(`Compiling code for ${contractAddress.toString()}`);
  execSync(`mkdir -p ${OUTPUT_BUILD_DIR}`, {
    stdio: ["inherit", "inherit", "inherit"],
  });
  namedAddresses[contractName] = contractAddress;
  namedAddresses["redstone_price_adapter"] = namedAddresses[PRICE_ADAPTER];
  compileCodeForDeployment(contractName, namedAddresses);
  const { metadataBytes, bytecode } = getPackageBytesToPublish(
    getJsonBuildFile(contractName)
  );

  return {
    builder,
    contractAddress,
    metadataBytes,
    bytecode,
  };
}

function getJsonBuildFile(
  contractName: string,
  outputBuildDir = OUTPUT_BUILD_DIR
) {
  return path.join(outputBuildDir, `${contractName}.json`);
}

function getJsonAddressesFile(
  contractName: string,
  outputBuildDir = "./movement/deployments/"
) {
  return path.join(outputBuildDir, `${contractName}-addresses.json`);
}

function compileCodeForDeployment(
  contractName: string,
  namedAddresses: NamedAddresses,
  outputBuildDir = OUTPUT_BUILD_DIR
) {
  const namedAddressesParam = Object.entries(namedAddresses)
    .filter(([_, value]) => !!value)
    .map(([key, value]) => `${key}=${value!.toString()}`)
    .join(",");
  const cmd = `movement move build-publish-payload --package-dir ./movement/contracts/${contractName} --named-addresses ${namedAddressesParam} --json-output-file ${getJsonBuildFile(contractName, outputBuildDir)} --assume-yes`;
  console.log(cmd);
  execSync(cmd, { stdio: ["inherit", "inherit", "inherit"] });
}

async function deploy(
  aptos: Aptos,
  account: Account,
  contractName: string,
  namedAddresses: NamedAddresses = {}
) {
  const { builder, contractAddress, metadataBytes, bytecode } =
    await setUpDeploy(aptos, account, contractName, namedAddresses);

  console.log(`Doing actions as account: ${account.accountAddress.toString()}`);
  console.log(`Object address for deployment: ${contractAddress.toString()}`);

  console.log("Publishing package");
  const publishTx = await builder.objectPublishTx(
    account.accountAddress,
    metadataBytes,
    bytecode
  );

  await handleTx(aptos, publishTx, account);

  console.log("deployed under:");
  const output = {
    contractAddress: contractAddress.toString(),
  } as { [p: string]: string };

  if (contractName === PRICE_ADAPTER) {
    output["objectAddress"] =
      getPriceAdapterObjectAddress(contractAddress).toString();
  }

  console.log(output);

  fs.writeFileSync(
    getJsonAddressesFile(contractName),
    JSON.stringify(output, null, 2)
  );
}

function readAddress(contractName: string) {
  const content = JSON.parse(
    fs.readFileSync(getJsonAddressesFile(contractName), "utf-8")
  ) as { contractAddress: string };

  return AccountAddress.fromString(content.contractAddress);
}

function readDepAddresses(deps: string[]) {
  return Object.fromEntries(
    deps.map((dep) => [dep, readAddress(dep)])
  ) as NamedAddresses;
}

function getEnvParams() {
  const contractName = RedstoneCommon.getFromEnv(
    "CONTRACT_NAME",
    z.enum([REDSTONE_SDK, PRICE_ADAPTER, PRICE_FEED])
  );
  const key = PrivateKey.formatPrivateKey(
    RedstoneCommon.getFromEnv("PRIVATE_KEY"),
    PrivateKeyVariants.Secp256k1
  );
  const account = Account.fromPrivateKey({
    privateKey: new Secp256k1PrivateKey(key),
  });

  return { contractName, account };
}

async function main() {
  const { contractName, account } = getEnvParams();
  const aptos = makeAptos();

  switch (contractName) {
    case REDSTONE_SDK:
      await deploy(aptos, account, contractName);
      break;

    case PRICE_ADAPTER:
      await deploy(
        aptos,
        account,
        contractName,
        readDepAddresses([REDSTONE_SDK])
      );
      break;

    case PRICE_FEED: {
      const depsAddresses = readDepAddresses([REDSTONE_SDK, PRICE_ADAPTER]);
      depsAddresses["price_adapter_object_address"] =
        getPriceAdapterObjectAddress(depsAddresses[PRICE_ADAPTER]!);
      await deploy(aptos, account, contractName, depsAddresses);
      break;
    }
  }
}

void main();
