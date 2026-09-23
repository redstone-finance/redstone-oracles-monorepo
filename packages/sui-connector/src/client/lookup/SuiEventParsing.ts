import { bcs } from "@mysten/sui/bcs";
import type { SuiClientTypes } from "@mysten/sui/client";
import { convertValueDec, EventEntry, Events } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { SUI_PRICE_WRITE_EVENT_FRAGMENT, SUI_UPDATE_ERROR_EVENT_FRAGMENT } from "./SuiTxParsing";

interface RawSuiEvent {
  type: string;
  json: unknown;
}

const logger = loggerFactory("sui-event-parsing");
const PriceWriteEventJsonSchema = z.object({
  feed_id: z.string(),
  value: z.string(),
});

const UpdateErrorEventJsonSchema = z.object({
  feed_id: z.union([z.string(), z.array(z.number())]),
  error: z.string(),
});

const EVM_VALUE_UPDATE_EVENT_NAME = "ValueUpdate";
const EVM_SKIP_BLOCK_TIMESTAMP_EVENT_NAME = "UpdateSkipDueToBlockTimestamp";
const EVM_SKIP_DATA_TIMESTAMP_EVENT_NAME = "UpdateSkipDueToDataTimestamp";
const EVM_SKIP_INVALID_VALUE_EVENT_NAME = "UpdateSkipDueToInvalidValue";

const BLOCK_TIMESTAMP_UPDATE_ERRORS = ["Bad update time"];
const DATA_TIMESTAMP_UPDATE_ERRORS = [
  "Timestamp too old",
  "Timestamp too future",
  "Not all timestamps are the same",
];

const UNKNOWN_UPDATE_ERROR = "Unknown update error";
const UNKNOWN_FEED_ID = "Unknown feed";
const UpdateErrorEventBcs = bcs.struct("UpdateError", {
  feed_id: bcs.vector(bcs.u8()),
  error: bcs.string(),
});

export function parseSuiEvents(events: RawSuiEvent[]) {
  const result: Events = {};

  for (const event of events) {
    const entry = parseSuiEvent(event);
    if (entry) {
      result[entry.feedId] = entry;
    }
  }

  return result;
}

export function extractSuiUpdateErrors(events: SuiClientTypes.Event[]) {
  return events
    .filter((event) => isUpdateErrorEventType(event.eventType))
    .map((event) => decodeUpdateError(event.bcs));
}

function parseSuiEvent(event: RawSuiEvent) {
  try {
    if (isPriceWriteEventType(event.type)) {
      const json = PriceWriteEventJsonSchema.parse(event.json);
      const value = Number(convertValueDec(json.value));

      return {
        name: EVM_VALUE_UPDATE_EVENT_NAME,
        feedId: decodeStringFeedId(json.feed_id),
        updated: true,
        value,
      } satisfies EventEntry;
    }

    if (isUpdateErrorEventType(event.type)) {
      const json = UpdateErrorEventJsonSchema.parse(event.json);

      return {
        name: getSkipEventName(json.error),
        feedId: decodeBytesFeedId(json.feed_id),
        updated: false,
      } satisfies EventEntry;
    }

    return undefined;
  } catch (error) {
    logger.warn(`Could not parse Sui event: ${RedstoneCommon.stringifyError(error)}`);

    return undefined;
  }
}

function isPriceWriteEventType(type: string) {
  return type.endsWith(SUI_PRICE_WRITE_EVENT_FRAGMENT);
}

function isUpdateErrorEventType(type: string) {
  return type.endsWith(SUI_UPDATE_ERROR_EVENT_FRAGMENT);
}

function getSkipEventName(error: string) {
  if (BLOCK_TIMESTAMP_UPDATE_ERRORS.includes(error)) {
    return EVM_SKIP_BLOCK_TIMESTAMP_EVENT_NAME;
  }
  if (DATA_TIMESTAMP_UPDATE_ERRORS.includes(error)) {
    return EVM_SKIP_DATA_TIMESTAMP_EVENT_NAME;
  }

  return EVM_SKIP_INVALID_VALUE_EVENT_NAME;
}

function decodeUpdateError(bytes: Uint8Array) {
  try {
    const { feed_id, error } = UpdateErrorEventBcs.parse(bytes);

    return { feedId: decodeBytesFeedId(feed_id), error };
  } catch {
    return { feedId: UNKNOWN_FEED_ID, error: UNKNOWN_UPDATE_ERROR };
  }
}

function decodeStringFeedId(feedId: string) {
  return feedId.replace(/\0+$/, "");
}

function decodeBytesFeedId(feedId: string | number[]) {
  const bytes = typeof feedId === "string" ? Buffer.from(feedId, "base64") : feedId;

  return ContractParamsProvider.unhexlifyFeedId(bytes);
}
