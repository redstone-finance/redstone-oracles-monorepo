import type { EventEntry } from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import type { BigNumber } from "ethers";
import { Interface, isHexString, parseBytes32String } from "ethers/lib/utils";
import { extractDataPointValue } from "./abi-utils";

const KNOWN_EVENTS_MULTI_FEED_UPDATE = ["ValueUpdate(uint256,bytes32,uint256)"];
const KNOWN_EVENTS_MULTI_FEED = [
  "UpdateSkipDueToBlockTimestamp(bytes32)",
  "UpdateSkipDueToDataTimestamp(bytes32)",
  "UpdateSkipDueToInvalidValue(bytes32)",
  ...KNOWN_EVENTS_MULTI_FEED_UPDATE,
];
const KNOWN_EVENTS_OTHER = [
  "AnswerUpdated(int256 indexed,uint256 indexed,uint256)", // MergedPriceAdapter
  "CannotUpdateMoreThanOneDataFeed()",
  "Transfer(address indexed,address indexed,uint256)", // Tempo networks
];
const eventsInterface = new Interface(
  [...KNOWN_EVENTS_MULTI_FEED, ...KNOWN_EVENTS_OTHER].map((sig) => `event ${sig}`)
);
const logger = loggerFactory("parse-log-event");

export function parseLogEvent(log: { topics: string[]; data: string }): EventEntry | undefined {
  try {
    const parsed = eventsInterface.parseLog(log);
    if (!eventNames(KNOWN_EVENTS_MULTI_FEED).includes(parsed.name)) {
      return undefined;
    }
    const updated = eventNames(KNOWN_EVENTS_MULTI_FEED_UPDATE).includes(parsed.name);
    const found = parsed.args.find((elt) => isHexString(elt)) as string | undefined;
    const base = {
      name: parsed.name,
      args: parsed.args,
      feedId: parseBytes32String(found ?? "0x"),
    };

    return updated
      ? {
          ...base,
          updated: true,
          value: extractDataPointValue({ value: parsed.args[0] as BigNumber }),
        }
      : { updated: false, ...base };
  } catch (e) {
    logger.warn(
      `Failed to parse log event ${RedstoneCommon.stringify(log)}: ${RedstoneCommon.stringifyError(e)}`
    );

    return undefined;
  }
}

function eventNames(array: string[]) {
  return array.map((item) => item.split("(").at(0)).filter(RedstoneCommon.isDefined);
}
