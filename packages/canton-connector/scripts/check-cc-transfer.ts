/**
 * Diagnoses whether a transfer actually moved funds, and how fresh the balance reading is.
 *
 *   NETWORK=mainnet UPDATE_IDS=1220abc...,1220def... yarn global:tsx scripts/check-cc-transfer.ts
 */

import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import * as AllDefs from "../src/canton-defs.json";
import { describeError, latestMigrationId, makeScanApi, upstreamStatus } from "./canton-scan";
import { readNetwork } from "./utils";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pulls Amulet-ish created/archived events out of an update, whatever the nesting. */
function summarizeUpdate(update: unknown) {
  const rows: string[] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);

      return;
    }
    if (!isObject(node)) {
      return;
    }

    const templateId = typeof node.template_id === "string" ? node.template_id : undefined;

    if (templateId?.includes(":Splice.Amulet:")) {
      const kind = typeof node.event_type === "string" ? node.event_type : "event";
      const args = isObject(node.create_arguments) ? node.create_arguments : {};
      const owner = ["owner", "provider", "receiver", "sender", "dso"]
        .map((key) => (typeof args[key] === "string" ? `${key}=${String(args[key])}` : undefined))
        .filter((value) => value !== undefined)
        .join(" ");
      const amount = isObject(args.amount)
        ? JSON.stringify(args.amount)
        : typeof args.amount === "string"
          ? args.amount
          : undefined;

      rows.push(
        `    ${kind.padEnd(15)} ${templateId.split(":").slice(1).join(":").padEnd(34)} ` +
          `${amount ? `amount=${amount} ` : ""}${owner}`
      );
    }

    Object.values(node).forEach(visit);
  };

  visit(update);

  return rows;
}

async function main() {
  const network = readNetwork();
  const nodeDefs = AllDefs[network].node;
  const updateIds = RedstoneCommon.getFromEnv("UPDATE_IDS", z.string().optional())
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const { api, scanBaseUrl } = makeScanApi();
  const migrationId = await latestMigrationId(api);

  console.log(`network=${network} scan=${scanBaseUrl} migration_id=${migrationId}\n`);

  // 1. How stale is the snapshot that balances are read from?
  const before = new Date().toISOString();
  const { data: snapshot } = await api.requestWithProxy<{ record_time: string }>(
    `/v0/state/acs/snapshot-timestamp?before=${encodeURIComponent(before)}&migration_id=${migrationId}`
  );
  const lagMinutes = (Date.parse(before) - Date.parse(snapshot.record_time)) / 60_000;

  console.log(`ACS snapshot used for balances: ${snapshot.record_time}`);
  console.log(`now:                            ${before}`);
  console.log(
    `=> balances are ${lagMinutes.toFixed(1)} minutes stale` +
      (lagMinutes > 15
        ? "  <-- a recent transfer would NOT show yet\n"
        : "  (fresh enough to show a recent transfer)\n")
  );

  if (!updateIds?.length) {
    console.log("Set UPDATE_IDS=<id>,<id> to also inspect the committed transactions.");

    return;
  }

  // 2. What did each committed transaction actually do?
  for (const updateId of updateIds) {
    console.log(`update ${updateId}`);

    let found = false;
    for (const path of [`/v0/updates/${updateId}`, `/v0/events/${updateId}`]) {
      try {
        const { data } = await api.requestWithProxy<unknown>(path);
        const rows = summarizeUpdate(data);
        const raw: unknown = isObject(data)
          ? isObject(data.update)
            ? data.update.record_time
            : data.record_time
          : undefined;
        const recordTime = typeof raw === "string" ? raw : "?";

        console.log(`  via ${path} - record_time=${recordTime}`);
        console.log(rows.length > 0 ? rows.join("\n") : "    (no Splice.Amulet events found)");
        found = true;
        break;
      } catch (error) {
        const { status, message } = describeError(error);
        console.log(`  ${path} -> ${upstreamStatus(message) ?? status ?? "ERR"}`);
      }
    }

    if (!found) {
      console.log(`  ⚠️  update not retrievable - it may not be visible to us on scan`);
    }
    console.log();
  }

  console.log(`sender:    ${nodeDefs.participantPartyId}`);
  console.log(`recipient: ${nodeDefs.primaryFaLockingPartyId}`);
}

main().catch((error: unknown) => {
  console.error(RedstoneCommon.stringifyError(error));
  process.exit(1);
});
