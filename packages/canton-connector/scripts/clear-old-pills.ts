import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { PillCleaner } from "../src/adapters/PillCleaner";
import { makeDefaultScriptClient, makePartyId } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const OWNER_PARTY_NAME = `RedStoneOracleOwner`;

async function main() {
  const client = makeDefaultScriptClient();

  const interfaceId = RedstoneCommon.getFromEnv(
    "CANTON_PILL_INTERFACE_ID",
    z.string().default(client.getDefs().pricePillInterfaceId)
  );

  const cleaner = new PillCleaner(
    client,
    makePartyId(VIEWER_PARTY_NAME),
    makePartyId(OWNER_PARTY_NAME),
    interfaceId
  );

  console.log(`Archiving stale pills of ${interfaceId} on ${client.network}`);

  await cleaner.archiveAll();
}

void main();
