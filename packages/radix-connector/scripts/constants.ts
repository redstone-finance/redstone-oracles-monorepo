import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { DEFAULT_RADIX_CLIENT_CONFIG, RadixClientBuilder } from "../src";

const DEPLOYMENT_DIR = RedstoneCommon.getFromEnv(
  "DEPLOYMENT_DIR",
  z.string().default("")
);
const SCRYPTO_DIR = `../scrypto/${DEPLOYMENT_DIR}`;

export const TRUSTED_UPDATERS =
  RedstoneCommon.getFromEnv(
    "TRUSTED_UPDATERS",
    z.array(z.string()).optional()
  ) ?? [];

const NETWORK_ID = RedstoneCommon.getFromEnv(
  "NETWORK_ID",
  z.number().optional()
);

export const NETWORK =
  NETWORK_ID === NetworkId.Mainnet
    ? { id: NetworkId.Mainnet, name: "mainnet", basePath: undefined }
    : { id: NetworkId.Stokenet, name: "stokenet", basePath: undefined };

export const FEED_ID = "XRD";
export const DATA_SERVICE_ID = "redstone-primary-prod";
export const PRICE_ADAPTER_NAME = "price_adapter";
export const PRICE_FEED_NAME = "price_feed";
export const PROXY_NAME = "proxy";

const PRIVATE_KEY_VALUE = RedstoneCommon.getFromEnv(
  "PRIVATE_KEY",
  z.string().optional()
);

const PRIVATE_KEY_SCHEME = RedstoneCommon.getFromEnv(
  "PRIVATE_KEY_SCHEME",
  z.enum(["secp256k1", "ed25519"]).default("secp256k1")
);
export const PRIVATE_KEY: RedstoneCommon.PrivateKey | undefined =
  PRIVATE_KEY_VALUE
    ? {
        scheme: PRIVATE_KEY_SCHEME,
        value: PRIVATE_KEY_VALUE,
      }
    : undefined;

export async function loadAddress(
  entityType: "component" | "package",
  contractName: string,
  clientName?: string
) {
  return (
    await fs.promises.readFile(
      getContractFilename(
        formatAddressFilename(clientName, entityType),
        contractName,
        "deployed"
      ),
      "utf8"
    )
  ).trim();
}

export async function saveAddress(
  entityType: "component" | "package",
  contractName: string,
  address: string,
  clientName?: string
) {
  await fs.promises.writeFile(
    getContractFilename(
      formatAddressFilename(clientName, entityType),
      contractName,
      "deployed"
    ),
    address
  );
}

export function getContractFilename(
  filename: string,
  ...subdirectories: string[]
) {
  return path.join(
    __dirname,
    SCRYPTO_DIR,
    "contracts",
    ...subdirectories,
    filename
  );
}

function formatAddressFilename(
  clientName: string | undefined,
  entityType: "component" | "package"
) {
  const clientNameString = clientName ? `${clientName}.` : "";
  return `${clientNameString}${NETWORK.name}.${entityType}.addr`;
}

export function makeRadixClient(networkId?: number) {
  return new RadixClientBuilder()
    .withNetworkId(networkId ?? NETWORK.id)
    .withRpcUrl(NETWORK.basePath)
    .withPrivateKey(PRIVATE_KEY)
    .withClientConfig({ ...DEFAULT_RADIX_CLIENT_CONFIG, maxFeeXrd: 1 })
    .build();
}
