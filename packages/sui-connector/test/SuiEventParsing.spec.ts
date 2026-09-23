import { makeFeedIdBytes } from "../src";
import { extractSuiUpdateErrors, parseSuiEvents } from "../src/client/lookup/SuiEventParsing";
import {
  ADAPTER_MODULE,
  FEED_ID,
  makePriceWriteEvent,
  makeUpdateErrorEvent,
  OTHER_FEED_ID,
  PACKAGE_ID,
  PRICE_WRITE_TYPE,
  TIMESTAMP_ERROR,
  UPDATE_ERROR_TYPE,
} from "./fixtures";

const OTHER_EVENT_TYPE = `${PACKAGE_ID}::${ADAPTER_MODULE}::Other`;
const WRITTEN_VALUE = "8599075320000";
const WRITTEN_VALUE_AS_NUMBER = 85990.7532;
const INVALID_VALUE_ERROR = "Value is not in the allowed range";
const UNDECODABLE_EVENT_BYTES = Uint8Array.from([255]);
const UNKNOWN_FEED_ID = "Unknown feed";
const UNKNOWN_UPDATE_ERROR = "Unknown update error";
const VALUE_UPDATE_EVENT = "ValueUpdate";

describe("parseSuiEvents", () => {
  it("should read a price write with the feed id as a padded string", () => {
    const events = parseSuiEvents([
      { type: PRICE_WRITE_TYPE, json: { feed_id: `${FEED_ID}\0\0\0`, value: WRITTEN_VALUE } },
    ]);

    expect(events).toEqual({
      [FEED_ID]: {
        name: VALUE_UPDATE_EVENT,
        feedId: FEED_ID,
        updated: true,
        value: WRITTEN_VALUE_AS_NUMBER,
      },
    });
  });

  it("should read an update error with the feed id as base64", () => {
    const feedId = Buffer.from(makeFeedIdBytes(OTHER_FEED_ID)).toString("base64");

    const events = parseSuiEvents([
      { type: UPDATE_ERROR_TYPE, json: { feed_id: feedId, error: TIMESTAMP_ERROR } },
    ]);

    expect(events).toEqual({
      [OTHER_FEED_ID]: {
        name: "UpdateSkipDueToDataTimestamp",
        feedId: OTHER_FEED_ID,
        updated: false,
      },
    });
  });

  it("should read an update error with the feed id as an array of numbers", () => {
    const events = parseSuiEvents([
      {
        type: UPDATE_ERROR_TYPE,
        json: { feed_id: Array.from(makeFeedIdBytes(OTHER_FEED_ID)), error: INVALID_VALUE_ERROR },
      },
    ]);

    expect(events).toEqual({
      [OTHER_FEED_ID]: {
        name: "UpdateSkipDueToInvalidValue",
        feedId: OTHER_FEED_ID,
        updated: false,
      },
    });
  });

  it("should skip a broken event and keep the remaining ones", () => {
    const events = parseSuiEvents([
      { type: PRICE_WRITE_TYPE, json: { feed_id: FEED_ID, value: null } },
      { type: PRICE_WRITE_TYPE, json: { feed_id: `${OTHER_FEED_ID}\0`, value: WRITTEN_VALUE } },
    ]);

    expect(events).toEqual({
      [OTHER_FEED_ID]: {
        name: VALUE_UPDATE_EVENT,
        feedId: OTHER_FEED_ID,
        updated: true,
        value: WRITTEN_VALUE_AS_NUMBER,
      },
    });
  });

  it("should ignore an event of another type", () => {
    expect(parseSuiEvents([{ type: OTHER_EVENT_TYPE, json: {} }])).toEqual({});
  });
});

describe("extractSuiUpdateErrors", () => {
  it("should decode the feed id and the reason of every update error", () => {
    const errors = extractSuiUpdateErrors([
      makeUpdateErrorEvent(FEED_ID),
      makePriceWriteEvent(OTHER_FEED_ID),
      makeUpdateErrorEvent(OTHER_FEED_ID, INVALID_VALUE_ERROR),
    ]);

    expect(errors).toEqual([
      { feedId: FEED_ID, error: TIMESTAMP_ERROR },
      { feedId: OTHER_FEED_ID, error: INVALID_VALUE_ERROR },
    ]);
  });

  it("should report an undecodable update error instead of throwing", () => {
    const event = { ...makeUpdateErrorEvent(FEED_ID), bcs: UNDECODABLE_EVENT_BYTES };

    expect(extractSuiUpdateErrors([event])).toEqual([
      { feedId: UNKNOWN_FEED_ID, error: UNKNOWN_UPDATE_ERROR },
    ]);
  });
});
