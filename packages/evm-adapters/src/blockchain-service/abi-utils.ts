import {
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_SIGNATURE,
  SELECTOR_SIG_SIZE_BYTES,
} from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { MathUtils } from "@redstone-finance/utils";
import { BigNumberish } from "ethers";
import { AbiCoder, hexDataSlice, parseBytes32String } from "ethers/lib/utils";

const REDSTONE_DEFAULT_DECIMALS = consts.DEFAULT_NUM_VALUE_DECIMALS;

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

export function extractDataPointValue(dataPoint: { value: BigNumberish }) {
  // Yes, it's a hack with decimals. Probably we will solve it better in future
  const decimals = REDSTONE_DEFAULT_DECIMALS;
  const precisionScaler = new MathUtils.PrecisionScaler(decimals);

  return precisionScaler.fromSolidityValue(dataPoint.value).toNumber();
}
