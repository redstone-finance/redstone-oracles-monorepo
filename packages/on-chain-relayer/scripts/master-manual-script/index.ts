import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import {
  AdapterType,
  ManifestReading,
} from "@redstone-finance/on-chain-relayer-common";
import { NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { runIteration } from "../../src";
import { config, ConsciouslyInvoked } from "../../src/config/config";
import { clearCachedRelayerProvider } from "../../src/core/contract-interactions/get-relayer-provider";
import { clearCachedTxDeliveryMan } from "../../src/core/TxDeliveryManSingleton";
import { getContractFacade } from "../../src/facade/get-contract-facade";
import { relayerNameToManualKeyArn } from "./relayer-name-to-manual-key";

const relayersToSkipFromEnv = RedstoneCommon.getFromEnv(
  "RELAYERS_TO_SKIP",
  z.string().array().default([])
);

const relayersToExecute = RedstoneCommon.getFromEnv(
  "RELAYERS_TO_EXECUTE",
  z.string().array().optional()
);

const privateKeyOverride = RedstoneCommon.getFromEnv(
  "PRIVATE_KEY_OVERRIDE",
  z.string().optional()
);

const defaultRelayersToSkip = [
  "sepoliaAngleAgeur",
  "sepoliaVenusXvs",
  "venusBnbTestnet",
  "optimismDevMultiFeed",
  "sepoliaMultiFeed",
  "blastTestnet",
];

function getManualKeySSMName(manifestName: string) {
  if (relayerNameToManualKeyArn[manifestName]) {
    return relayerNameToManualKeyArn[manifestName];
  }
  const encodedManifestName = manifestName
    .replace(/fundamental/g, "-fundamental")
    .replace(/Testnet/g, "-testnet")
    // Insert a slash before the first uppercase letter
    .replace(/([A-Z])/, "/$1")
    // Replace uppercase letters not preceded by a slash with hyphen followed by lowercase
    .replace(/\/([A-Z])|([A-Z])/g, (_match, p1: string, p2: string) => {
      if (p1) {
        // If the uppercase letter is right after a slash, convert it to lowercase
        return `/${p1.toLowerCase()}`;
      }
      // Otherwise, replace the uppercase letter with hyphen + lowercase
      return `-${p2.toLowerCase()}`;
    });
  return `/prod/on-chain-relayer/${encodedManifestName}/manual/private-key`;
}

function clearCache() {
  clearCachedTxDeliveryMan();
  clearCachedRelayerProvider();
}

async function setUpEnvVariables(
  manifestName: string,
  networkId: NetworkId,
  adapterContractType: AdapterType
) {
  process.env.MANIFEST_FILE = `./relayer-manifests${adapterContractType === "multi-feed" ? "-multi-feed" : ""}/${manifestName}.json`;
  try {
    process.env.PRIVATE_KEY =
      privateKeyOverride ??
      (await getSSMParameterValue(getManualKeySSMName(manifestName)));
  } catch {
    console.log(
      `📛Failed to fetch wallet key: ${getManualKeySSMName(manifestName)}📛`
    );
    return false;
  }
  try {
    process.env.RPC_URLS = await getSSMParameterValue(
      `/prod/rpc/${networkId}/urls`
    );
  } catch {
    console.log(`📛Failed to fetch rpc urls: /prod/rpc/${networkId}/urls📛`);
    return false;
  }
  return true;
}

async function main() {
  const relayersToSkip = [...defaultRelayersToSkip, ...relayersToSkipFromEnv];
  const classicManifests = ManifestReading.readClassicManifests();
  const multiFeedManifests = ManifestReading.readMultiFeedManifests();
  const manifests = { ...classicManifests, ...multiFeedManifests };

  for (const [manifestName, { chain, adapterContractType }] of Object.entries(
    manifests
  )) {
    if (
      (relayersToExecute && !relayersToExecute.includes(manifestName)) ||
      relayersToSkip.includes(manifestName)
    ) {
      continue;
    }

    console.log(
      `\n****************************************\n`,
      `Running iteration of ${manifestName} relayer.`,
      `\n****************************************\n`
    );

    if (
      !(await setUpEnvVariables(manifestName, chain.id, adapterContractType))
    ) {
      continue;
    }

    clearCache();
    const relayerConfig = await config(ConsciouslyInvoked);
    const contractFacade = await getContractFacade(relayerConfig);

    try {
      const iteration = runIteration(contractFacade, relayerConfig);
      await RedstoneCommon.timeout(iteration, 15000);
    } catch (e) {
      console.error(
        `An error occurred while running iteration of ${manifestName}`,
        e
      );
    }
  }
  console.log("All relayers iterations finished.");
}

void main();
