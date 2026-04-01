import { PillCleaner } from "../src/adapters/PillCleaner";
import { makeDefaultClient, makePartyId } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const OWNER_PARTY_NAME = `RedStoneOracleOwner`;

async function main() {
  const client = makeDefaultClient();

  const cleaner = new PillCleaner(
    client,
    makePartyId(VIEWER_PARTY_NAME),
    makePartyId(OWNER_PARTY_NAME)
  );

  await cleaner.archiveAll();
}

void main();
