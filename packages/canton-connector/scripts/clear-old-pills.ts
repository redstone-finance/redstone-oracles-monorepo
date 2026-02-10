import { PillCleaner } from "../src";
import { makeDefaultClient } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const OWNER_PARTY_NAME = `RedStoneOracleOwner`;

async function main() {
  const [client, ownerClient] = [VIEWER_PARTY_NAME, OWNER_PARTY_NAME].map(makeDefaultClient);

  const cleaner = new PillCleaner(client, ownerClient);

  await cleaner.archiveAll();
}

void main();
