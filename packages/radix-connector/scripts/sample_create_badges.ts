import { BadgeCreatorRadixContractConnector } from "../src";
import { BADGE_CREATOR_NAME, loadAddress, makeRadixClient } from "./constants";

async function createBadges() {
  const client = makeRadixClient();

  const connector = new BadgeCreatorRadixContractConnector(
    client,
    await loadAddress(`package`, BADGE_CREATOR_NAME)
  );

  await connector.createBadges();
}

void createBadges();
