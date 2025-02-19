import {
  Account,
  AccountAddress,
  Aptos,
  createObjectAddress,
  HexInput,
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
import {
  MovementNetworkSchema,
  movementNetworkSchemaToAptosNetwork,
} from "../src";
import { MovementPackageTxBuilder } from "./package";
import { handleTx, objectSeed } from "./utils";

export const OUTPUT_BUILD_DIR = "./movement/build/";
export const PRICE_ADAPTER = "price_adapter";
export const REDSTONE_SDK = "redstone_sdk";
export const PRICE_FEED = "price_feed";
export const ContractNameSchema = z.enum([
  REDSTONE_SDK,
  PRICE_ADAPTER,
  PRICE_FEED,
]);

type NamedAddresses = { [p: string]: AccountAddress | undefined };

function readAddress(contractName: string, networkName: string) {
  const content = JSON.parse(
    fs.readFileSync(getJsonAddressesFile(contractName, networkName), "utf-8")
  ) as { contractAddress: string };

  return AccountAddress.fromString(content.contractAddress);
}

export function readDepAddresses(deps: string[], networkName: string) {
  return Object.fromEntries(
    deps.map((dep) => [dep, readAddress(dep, networkName)])
  ) as NamedAddresses;
}

export function getPackageBytesToPublish(moduleFile: string) {
  const jsonData = JSON.parse(fs.readFileSync(moduleFile, "utf8")) as {
    args: { value: HexInput | HexInput[] }[];
  };

  const metadataBytes = jsonData.args[0].value as HexInput;
  const bytecode = jsonData.args[1].value as HexInput[];

  return { metadataBytes, bytecode };
}

export function getJsonBuildFile(
  contractName: string,
  outputBuildDir = OUTPUT_BUILD_DIR
) {
  return path.join(outputBuildDir, `${contractName}.json`);
}

export function getJsonAddressesFile(
  contractName: string,
  networkName: string,
  outputBuildDir = "./movement/deployments/"
) {
  return path.join(
    outputBuildDir,
    `${networkName}-${contractName}-addresses.json`
  );
}

export function readObjectAddress(contractName: string, networkName: string) {
  const content = JSON.parse(
    fs.readFileSync(getJsonAddressesFile(contractName, networkName), "utf-8")
  ) as { contractAddress: string; objectAddress: string };

  return {
    contractAddress: AccountAddress.fromString(content.contractAddress),
    objectAddress: AccountAddress.fromString(content.objectAddress),
  };
}

export function getEnvParams(skip?: string[]) {
  const skipEnv = skip ? skip : [];
  const contractName = skipEnv.includes("CONTRACT_NAME")
    ? ""
    : RedstoneCommon.getFromEnv("CONTRACT_NAME", ContractNameSchema);
  const key = skipEnv.includes("PRIVATE_KEY")
    ? ""
    : PrivateKey.formatPrivateKey(
        RedstoneCommon.getFromEnv("PRIVATE_KEY"),
        PrivateKeyVariants.Secp256k1
      );
  const account = Account.fromPrivateKey({
    privateKey: new Secp256k1PrivateKey(key),
  });
  const networkSchema = skipEnv.includes("NETWORK")
    ? ""
    : RedstoneCommon.getFromEnv("NETWORK", z.optional(MovementNetworkSchema));
  const network = networkSchema
    ? movementNetworkSchemaToAptosNetwork(networkSchema)
    : undefined;
  const url = skipEnv.includes("REST_URL")
    ? ""
    : RedstoneCommon.getFromEnv("REST_URL", z.optional(z.string()));

  return { contractName, account, network, url };
}

export async function objectAddressForDeployment(
  aptos: Aptos,
  address: AccountAddress
) {
  const info = await aptos.account.getAccountInfo({ accountAddress: address });
  return createObjectAddress(
    address,
    objectSeed(+info.sequence_number + 1)
  ).toString();
}

export function getPriceAdapterObjectAddress(creator: AccountAddress) {
  return createObjectAddress(creator, "RedStonePriceAdapter");
}

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

export async function deploy(
  aptos: Aptos,
  account: Account,
  contractName: string,
  networkName: string,
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
    getJsonAddressesFile(contractName, networkName),
    JSON.stringify(output, null, 2)
  );
}
