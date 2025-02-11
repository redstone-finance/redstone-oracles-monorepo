import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  HexInput,
  MoveVector,
  Network,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
  U8,
} from "@aptos-labs/ts-sdk";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { AptosVariables, MovementLocalConfigSchema } from "./types";

export function makeFeedIdBytes(feedId: string): Uint8Array {
  return Uint8Array.from(Buffer.from(feedId.padEnd(32, "\0")));
}

export function feedIdHexToMoveVector(hex: string): MoveVector<U8> {
  return hex.startsWith("0x") ? MoveVector.U8(hex) : MoveVector.U8(`0x${hex}`);
}

export function makeAptosVariables(
  network: Network,
  packageAddress?: string,
  privateKey?: string
): AptosVariables {
  const config = readConfig(network);
  let account = makeAccountFromConfig(config);
  if (privateKey) {
    account = makeAccountFromSecp256k1Key(privateKey);
  }

  return {
    client: makeAptosClient(
      config.profiles.default.network.toLowerCase() as Network,
      config.profiles.default.rest_url
    ),
    account,
    packageObjectAddress: packageAddress
      ? AccountAddress.from(packageAddress)
      : account.accountAddress,
  };
}

function readConfig(network: Network): MovementLocalConfigSchema {
  const configFileContent = fs.readFileSync(
    "movement/.movement/config.yaml",
    "utf8"
  );
  const config: MovementLocalConfigSchema = yaml.load(
    configFileContent
  ) as MovementLocalConfigSchema;

  if ((config.profiles.default.network.toLowerCase() as Network) !== network) {
    throw new Error(
      `Wrong network in the config, expected ${network}, got ${config.profiles.default.network.toLowerCase()}.`
    );
  }

  return config;
}

function makeAptosClient(network: Network, nodeURL: string): Aptos {
  return new Aptos(
    new AptosConfig({
      network: replaceWithCustomWhenTestnet(network),
      fullnode: nodeURL,
    })
  );
}

function makeAccountFromConfig(
  config: MovementLocalConfigSchema,
  keyType?: PrivateKeyVariants
): Account {
  return Account.fromPrivateKey({
    privateKey: extractPrivateKey(
      config.profiles.default.private_key,
      keyType ? keyType : PrivateKeyVariants.Ed25519
    ),
    address: `0x${config.profiles.default.account}`,
  });
}

function makeAccountFromSecp256k1Key(privateKey: string): Account {
  return Account.fromPrivateKey({
    privateKey: extractPrivateKey(privateKey, PrivateKeyVariants.Secp256k1),
  });
}

function extractPrivateKey(
  key: HexInput,
  keyType: PrivateKeyVariants
): Ed25519PrivateKey | Secp256k1PrivateKey {
  switch (keyType) {
    case PrivateKeyVariants.Ed25519:
      return new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(key, PrivateKeyVariants.Ed25519)
      );
    case PrivateKeyVariants.Secp256k1:
      return new Secp256k1PrivateKey(
        PrivateKey.formatPrivateKey(key, PrivateKeyVariants.Secp256k1)
      );
  }
}

function replaceWithCustomWhenTestnet(movementNetwork: Network): Network {
  return movementNetwork === Network.TESTNET ? Network.CUSTOM : movementNetwork;
}
