import { Account, AccountAddress, Aptos, createObjectAddress, HexInput } from "@aptos-labs/ts-sdk";
import { execSync } from "child_process";
import "dotenv/config";
import fs from "fs";
import { EOL } from "os";
import path from "path";
import { isAptos } from "./config";
import { ContractName, PRICE_ADAPTER, PRICE_FEED, REDSTONE_SDK } from "./contract-name-enum";
import { getEnvContractName, getEnvDeployDir, getEnvNetwork } from "./get-env";
import { MULTI_SIG_ADDRESS } from "./ledger/const";
import { MovePackageTxBuilder } from "./package";
import { handleTx, objectSeed } from "./utils";

export const OUTPUT_BUILD_DIR = "./build/";

type NamedAddresses = { [p: string]: AccountAddress | undefined };

export function readAddress(contractName = getEnvContractName(), networkName = getEnvNetwork()) {
  const content = JSON.parse(
    fs.readFileSync(getJsonAddressesFile(contractName, networkName), "utf-8")
  ) as { contractAddress: string };

  return AccountAddress.fromString(content.contractAddress);
}

export function readDepAddresses(deps: ContractName[], networkName = getEnvNetwork()) {
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
  deployDir: string = getEnvDeployDir(),
  outputBuildDir = OUTPUT_BUILD_DIR
) {
  return path.join(deployDir, outputBuildDir, `${contractName}.json`);
}

export function getJsonAddressesFile(
  contractName: string,
  networkName: string,
  deployDir = getEnvDeployDir()
) {
  return path.join(deployDir, `${networkName}-${contractName}-addresses.json`);
}

export function readObjectAddress(contractName: string, networkName = getEnvNetwork()) {
  const content = JSON.parse(
    fs.readFileSync(getJsonAddressesFile(contractName, networkName), "utf-8")
  ) as { contractAddress: string; objectAddress: string };

  return {
    contractAddress: AccountAddress.fromString(content.contractAddress),
    objectAddress: content.objectAddress
      ? AccountAddress.fromString(content.objectAddress)
      : undefined,
  };
}

export async function objectAddressForDeployment(aptos: Aptos, address: AccountAddress) {
  const info = await aptos.account.getAccountInfo({ accountAddress: address });
  return createObjectAddress(address, objectSeed(+info.sequence_number + 1)).toString();
}

export function getPriceAdapterObjectAddress(creator: AccountAddress) {
  return createObjectAddress(creator, "RedStonePriceAdapter");
}

export async function setUpDeploy(
  aptos: Aptos,
  accountAddress: AccountAddress,
  contractName: string,
  namedAddresses: NamedAddresses,
  currentObjectAddress?: AccountAddress,
  networkName = getEnvNetwork(),
  deployDir = getEnvDeployDir()
) {
  const builder = new MovePackageTxBuilder(aptos);
  const contractAddress =
    currentObjectAddress ??
    AccountAddress.fromString(await objectAddressForDeployment(aptos, accountAddress));

  console.log(`Compiling code for ${contractAddress.toString()}`);
  namedAddresses[contractName] = contractAddress;
  namedAddresses["redstone_price_adapter"] = namedAddresses[PRICE_ADAPTER];
  compileCodeForDeployment(contractName, namedAddresses, networkName);
  const { metadataBytes, bytecode } = getPackageBytesToPublish(
    getJsonBuildFile(contractName, deployDir)
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
  networkName = getEnvNetwork(),
  deployDir = getEnvDeployDir(),
  outputBuildDir = OUTPUT_BUILD_DIR
) {
  const namedAddressesParam = Object.entries(namedAddresses)
    .filter(([_, value]) => !!value)
    .map(([key, value]) => `${key}=${value!.toString()}`)
    .join(",");
  execSync(`mkdir -p ${path.join(deployDir, outputBuildDir)}`, {
    stdio: ["inherit", "inherit", "inherit"],
  });
  const cmd = `${isAptos(networkName) ? "aptos" : "movement"} move build-publish-payload --package-dir ${deployDir}/${contractName} --named-addresses ${namedAddressesParam} --json-output-file ${getJsonBuildFile(contractName, deployDir, outputBuildDir)} --assume-yes`;
  console.log(cmd);
  execSync(cmd, { stdio: ["inherit", "inherit", "inherit"] });
}

export async function deploy(
  aptos: Aptos,
  account: Account,
  contractName: string,
  namedAddresses: NamedAddresses = {},
  currentObjectAddress: AccountAddress | undefined = undefined,
  deployDir = getEnvDeployDir(),
  networkName = getEnvNetwork()
) {
  const { builder, contractAddress, metadataBytes, bytecode } = await setUpDeploy(
    aptos,
    account.accountAddress,
    contractName,
    namedAddresses,
    currentObjectAddress,
    networkName,
    deployDir
  );

  console.log(`Doing actions as account: ${account.accountAddress.toString()}`);
  console.log(`Object address for deployment: ${contractAddress.toString()}`);

  console.log("Publishing package");
  const publishTx = currentObjectAddress
    ? await builder.objectUpgradeTx(
        account.accountAddress,
        currentObjectAddress,
        metadataBytes,
        bytecode
      )
    : await builder.objectPublishTx(account.accountAddress, metadataBytes, bytecode);

  await handleTx(aptos, publishTx, account);

  console.log("deployed under:");
  const output = {
    contractAddress: contractAddress.toString(),
  } as { [p: string]: string };

  if (contractName === PRICE_ADAPTER) {
    output["objectAddress"] = getPriceAdapterObjectAddress(contractAddress).toString();
  }

  console.log(output);

  const jsonFile = getJsonAddressesFile(contractName, networkName);
  fs.writeFileSync(jsonFile, JSON.stringify(output, null, 2));
  fs.appendFileSync(jsonFile, EOL);
}

export function prepareDepAddresses(
  contractName = getEnvContractName(),
  networkName = getEnvNetwork()
) {
  switch (contractName) {
    case REDSTONE_SDK:
      return {};

    case PRICE_ADAPTER:
      return readDepAddresses([REDSTONE_SDK], networkName);

    case PRICE_FEED: {
      const depsAddresses = readDepAddresses([REDSTONE_SDK, PRICE_ADAPTER], networkName);
      depsAddresses["price_adapter_object_address"] = getPriceAdapterObjectAddress(
        depsAddresses[PRICE_ADAPTER]!
      );
      return depsAddresses;
    }
    default:
      throw new Error(`Unsupported deploy: ${contractName}`);
  }
}

export const getTransactionJsonPath = (
  txId?: number,
  contractName = getEnvContractName(),
  network = getEnvNetwork()
) =>
  path.join(
    __dirname,
    "..",
    getEnvDeployDir(),
    `${network}-${contractName}-${MULTI_SIG_ADDRESS}-upgrade-${txId}.json`
  );
