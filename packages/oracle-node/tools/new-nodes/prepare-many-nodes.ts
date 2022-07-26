import { JWKInterface } from "arweave/node/lib/wallet";
import prompts from "prompts";
import fs from "fs";
import Arweave from "arweave/node";
import { ethers } from "ethers";
import { SmartWeaveNodeFactory } from "redstone-smartweave";
import {
  RedstoneOraclesInput,
  RegisterNodeInputData,
} from "../../src/contracts/redstone-oracle-registry/types";
import contractAddresses from "../../src/config/contracts.json";

const DEFAULT_LOGO_URL =
  "https://redstone.finance/assets/img/redstone-logo-full.svg";
const DEFAULT_NODE_URL = "https://redstone.finance";
const DEFAULT_IP_ADDRESS = "0.0.0.0";
const SECRETS_FOLDER = `./.secrets/tmp-${Date.now()}`;
const DEFAULT_NAME_PREFIX = "redstone-avalanche-prod-node-";
const DEFAULT_DESCRIPTION_PREFIX =
  "Most popular tokens from the Avalanche ecosystem - prod node ";
const DEFAULT_DATA_FEED_ID = "redstone-avalanche-prod";
const NODES_CONFIG_FILE = "./src/config/nodes.json";

interface InitialParamsForNewNodes {
  namePrefixForNodes: string;
  descriptionPrefixForNodes: string;
  dataFeedId: string;
  startNodeIndex: number;
  newNodesCount: number;
}

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

main();

async function main() {
  const initialParams = await getInitialParams();
  const { startNodeIndex, newNodesCount } = initialParams;

  createFolderIfNotCreated(SECRETS_FOLDER);

  for (
    let nodeIndex = startNodeIndex;
    nodeIndex < newNodesCount + startNodeIndex;
    nodeIndex++
  ) {
    console.log(`\n\nRegistering node: ${nodeIndex}`);
    await registerNewNode(nodeIndex, initialParams);
  }
}

async function registerNewNode(
  nodeIndex: number,
  nodesParams: InitialParamsForNewNodes
) {
  // Node details
  const name = nodesParams.namePrefixForNodes + nodeIndex;
  const description = nodesParams.descriptionPrefixForNodes + nodeIndex;

  // Generate arweave wallet
  console.log(`Generating Arweve and EVM wallets`);
  const jwk = await arweave.wallets.generate();
  const arweaveAddress = await arweave.wallets.jwkToAddress(jwk);
  const arweavePublicKey = jwk.n;

  // Generate evm wallet
  const evmWallet = ethers.Wallet.createRandom();
  const evmPrivateKey = evmWallet.privateKey;
  const evmPublicKey = evmWallet.publicKey;
  const evmAddress = evmWallet.address;

  // Creating config
  const config = prepareNewConfig(jwk, evmPrivateKey);

  // Save secrets in files
  saveJSONInFile(`${SECRETS_FOLDER}/${nodeIndex}.json`, config);

  // Update nodes config
  const nodesConfig = readJSONFromFile(NODES_CONFIG_FILE);
  nodesConfig[name] = {
    address: arweaveAddress,
    publicKey: arweavePublicKey,
    evmAddress: evmAddress,
    ecdsaPublicKey: evmPublicKey,
  };
  saveJSONInFile(NODES_CONFIG_FILE, nodesConfig, {
    prettifyJSON: true,
  });

  // Register node in oracle registry
  await registerNewNodeInOracleRegistry(
    {
      name,
      description,
      logo: DEFAULT_LOGO_URL,
      dataFeedId: nodesParams.dataFeedId,
      evmAddress,
      url: DEFAULT_NODE_URL,
      ipAddress: DEFAULT_IP_ADDRESS,
      ecdsaPublicKey: evmPublicKey,
      arweavePublicKey: arweavePublicKey,
    },
    jwk
  );
}

async function registerNewNodeInOracleRegistry(
  nodeOpts: RegisterNodeInputData,
  jwk: JWKInterface
) {
  console.log(`Registering new node in oracle registry`);
  const oracleRegistryContractAddress = contractAddresses["oracle-registry"];
  const contract = SmartWeaveNodeFactory.memCached(arweave, 1)
    .contract(oracleRegistryContractAddress)
    .connect(jwk);
  const tx = await contract.bundleInteraction<RedstoneOraclesInput>({
    function: "registerNode",
    data: nodeOpts,
  });
  console.log(JSON.stringify(tx));
  console.log("Tx sent to smartweave contract");
}

function prepareNewConfig(jwk: JWKInterface, ethereumPrivateKey: string) {
  return {
    arweaveKeysJWK: jwk,
    credentials: {
      ethereumPrivateKey,
    },
  };
}

function readJSONFromFile(path: string): any {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function saveJSONInFile(path: string, data: any, opts?: any) {
  const actionOnFile = fs.existsSync(path) ? "Updating" : "Creating";
  console.log(`${actionOnFile} file: ${path}`);
  const strData =
    JSON.stringify(data, undefined, opts?.prettifyJSON ? 2 : undefined) + "\n";
  fs.writeFileSync(path, strData);
}

function createFolderIfNotCreated(path: string) {
  if (!fs.existsSync(path)) {
    console.log(`Creating new folder: ${path}`);
    fs.mkdirSync(path);
  } else {
    console.log(`Folder already exists: ${path}`);
  }
}

async function getInitialParams(): Promise<InitialParamsForNewNodes> {
  return await prompts([
    {
      type: "text",
      name: "namePrefixForNodes",
      message: "Provide name prefix of redstone nodes",
      initial: DEFAULT_NAME_PREFIX,
      validate: (value) => (!value ? "Required" : true),
    },
    {
      type: "text",
      name: "descriptionPrefixForNodes",
      message: "Provide description prefix of redstone nodes",
      initial: DEFAULT_DESCRIPTION_PREFIX,
      validate: (value) => (!value ? "Required" : true),
    },
    {
      type: "text",
      name: "dataFeedId",
      message: "Provide data feed id for the new nodes",
      initial: DEFAULT_DATA_FEED_ID,
      validate: (value) => (!value ? "Required" : true),
    },
    {
      type: "number",
      name: "startNodeIndex",
      message: "Provide start node index (should be greater than 0)",
      initial: 1,
      validate: (value) => (Number(value) < 1 ? "Must be >= 1" : true),
    },
    {
      type: "number",
      name: "newNodesCount",
      message: "Provide number of new nodes (should be greater than 0)",
      initial: 1,
      validate: (value) => (Number(value) < 1 ? "Must be >= 1" : true),
    },
  ]);
}
