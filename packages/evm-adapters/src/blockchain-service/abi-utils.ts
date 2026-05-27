import {
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_SIGNATURE,
  SELECTOR_SIG_SIZE_BYTES,
  type EventEntry,
} from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { loggerFactory, MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { BigNumberish, type BigNumber } from "ethers";
import {
  AbiCoder,
  hexDataSlice,
  Interface,
  isHexString,
  parseBytes32String,
} from "ethers/lib/utils";

const KNOWN_EVENTS = [
  "UpdateSkipDueToBlockTimestamp(bytes32)",
  "UpdateSkipDueToDataTimestamp(bytes32)",
  "UpdateSkipDueToInvalidValue(bytes32)",
  "ValueUpdate(uint256,bytes32,uint256)",
];

export function parseFeedIdsArg(remainderPrefix: Uint8Array) {
  const selector = hexDataSlice(remainderPrefix, 0, SELECTOR_SIG_SIZE_BYTES);
  if (selector !== MULTI_FEED_RELAYER_UPDATE_FUNCTION_SIGNATURE) {
    return;
  }

  const params = hexDataSlice(remainderPrefix, SELECTOR_SIG_SIZE_BYTES);
  const coder = new AbiCoder();
  const [feedIds] = coder.decode(["bytes32[]"], params) as [string[]];

  return feedIds.map(parseBytes32String);
}

const eventsInterface = new Interface(KNOWN_EVENTS.map((sig) => `event ${sig}`));
const logger = loggerFactory("parse-log-event");

export function parseLogEvent(log: { topics: string[]; data: string }): EventEntry | undefined {
  try {
    const parsed = eventsInterface.parseLog(log);
    const updated = ["ValueUpdate"].includes(parsed.name);
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
    logger.warn(`Failed to parse log event: ${RedstoneCommon.stringifyError(e)}`);

    return undefined;
  }
}

const REDSTONE_DEFAULT_DECIMALS = consts.DEFAULT_NUM_VALUE_DECIMALS;

export function extractDataPointValue(dataPoint: { value: BigNumberish }) {
  // Yes, it's a hack with decimals. Probably we will solve it better in future
  const decimals = REDSTONE_DEFAULT_DECIMALS;
  const precisionScaler = new MathUtils.PrecisionScaler(decimals);

  return precisionScaler.fromSolidityValue(dataPoint.value).toNumber();
}
