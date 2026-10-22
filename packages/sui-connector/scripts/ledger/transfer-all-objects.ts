import type { SuiClientTypes } from "@mysten/sui/client";
import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { makeSuiClient, SuiNetworkName, SuiNetworkSchema } from "../../src";
import { MULTI_SIG_ADDRESS } from "./const";
import { generateTransactionData } from "./generate-transaction-data";

const DESTINATION_ADDRESS = "";
const SUI_COIN_TYPE = normalizeStructTag(`0x2::coin::Coin<${SUI_TYPE_ARG}>`);

async function fetchOwnedObjects(network: SuiNetworkName, owner: string) {
  const client = makeSuiClient(network);
  const objects: SuiClientTypes.Object[] = [];
  let cursor: string | null = null;

  do {
    const response: SuiClientTypes.ListOwnedObjectsResponse = await client.core.listOwnedObjects({
      owner,
      cursor,
    });
    objects.push(...response.objects);
    cursor = response.hasNextPage ? response.cursor : null;
  } while (cursor);

  return objects;
}

async function transferAllObjects(owner: string, destination: string) {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const objects = (await fetchOwnedObjects(network, owner)).filter(
    ({ type }) => normalizeStructTag(type) !== SUI_COIN_TYPE
  );

  console.error(
    `Transferring to ${destination}:`,
    objects.map(({ objectId, type }) => ({ objectId, type }))
  );

  await generateTransactionData(
    (tx) => tx.transferObjects([...objects.map(({ objectId }) => objectId), tx.gas], destination),
    owner
  );
}

void transferAllObjects(MULTI_SIG_ADDRESS, DESTINATION_ADDRESS);
