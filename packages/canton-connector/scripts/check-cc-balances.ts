/**
 * Read-only balance check for the parties involved in the FA-locking transfers.
 *
 *   NETWORK=mainnet yarn global:tsx scripts/check-cc-balances.ts
 */

import { RedstoneCommon } from "@redstone-finance/utils";
import Decimal from "decimal.js";
import "dotenv/config";
import { z } from "zod";
import * as AllDefs from "../src/canton-defs.json";
import { CantonScanApiClient } from "../src/client/CantonScanApiClient";
import { latestMigrationId, makeScanApi } from "./canton-scan";
import { readNetwork } from "./utils";

async function main() {
  const network = readNetwork();
  const nodeDefs = AllDefs[network].node;
  const { api, scanBaseUrl } = makeScanApi();
  const scan = new CantonScanApiClient(api, network);

  const extraLockingParties: [string, string][] = nodeDefs.faLockingPartyIds
    .filter((id) => id !== nodeDefs.primaryFaLockingPartyId)
    .map((id, i) => [`fa-locking #${i + 2}`, id]);

  const allParties: [string, string][] = [
    ["validator (sender)", nodeDefs.participantPartyId],
    ["fa-locking (recipient)", nodeDefs.primaryFaLockingPartyId],
    ...extraLockingParties,
  ];
  const parties = allParties.filter(([, id]) => id.length > 0);

  console.log(`network=${network} scan=${scanBaseUrl}`);

  const now = new Date().toISOString();
  const { data: snapshot } = await api.requestWithProxy<{ record_time: string }>(
    `/v0/state/acs/snapshot-timestamp?before=${encodeURIComponent(now)}` +
      `&migration_id=${await latestMigrationId(api)}`
  );
  const ageMinutes = (Date.parse(now) - Date.parse(snapshot.record_time)) / 60_000;

  console.log(
    `balances as of ${snapshot.record_time} (${ageMinutes.toFixed(0)} min ago)` +
      (ageMinutes > 15 ? " - transfers made since then are NOT included" : "")
  );
  console.log();

  let lockedTotal = new Decimal(0);

  for (const [label, partyId] of parties) {
    const summary = await scan.getAmuletHoldingsSummary(partyId);
    const balance = new Decimal(summary?.total_available_coin ?? "0");

    if (label.startsWith("fa-locking")) {
      lockedTotal = lockedTotal.plus(balance);
    }

    console.log(`${label.padEnd(24)} ${balance.toFixed(4).padStart(18)} CC`);
    console.log(`${"".padEnd(24)} ${partyId}\n`);
  }

  const limit = RedstoneCommon.getFromEnv(
    "FEATURED_APP_LOCK_LIMIT",
    z.coerce.number().default(5_000_000)
  );
  const missing = new Decimal(limit).minus(lockedTotal);

  console.log(`FA-locking total:        ${lockedTotal.toFixed(4).padStart(18)} CC`);
  console.log(`Featured App minimum:    ${new Decimal(limit).toFixed(4).padStart(18)} CC`);
  console.log(
    missing.gt(0)
      ? `⚠️  short by:             ${missing.toFixed(4).padStart(18)} CC`
      : `✅ above the minimum by:  ${missing.abs().toFixed(4).padStart(18)} CC`
  );
}

main().catch((error: unknown) => {
  console.error(RedstoneCommon.stringifyError(error));
  process.exit(1);
});
