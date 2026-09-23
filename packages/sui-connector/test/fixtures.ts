import { bcs } from "@mysten/sui/bcs";
import type { SuiClientTypes } from "@mysten/sui/client";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  computeSuiGasUsed,
  SUI_PRICE_WRITE_EVENT_FRAGMENT,
  SUI_UPDATE_ERROR_EVENT_FRAGMENT,
} from "../src/client/lookup/SuiTxParsing";
import { makeFeedIdBytes, uint8ArrayToBcs } from "../src/util";

export const NETWORK = "testnet";
export const PACKAGE_ID = "0xc2102acb2616b695ba5a3ee2fc12f61b9a19e246d6c933ceb1912842bb2b9edb";
export const ADAPTER_OBJECT_ID =
  "0x6403f9f18301ba3b75cbc7ecca747160e47dbc29fa3b794332efce3f06160255";
export const SENDER = "0x54dea2a20b49763b1a5de9046a3f3797057f8ccc56c9596b699110fc600ff39c";
export const OTHER_ADDRESS = "0xbd288ccf0f92df315f7b212e5481f4f2b469f6c61c0d58a16e616eb2e0341f9c";
export const DIGEST = "GEmLWhFbz22M4tMgUF8zP7G3V8zcWjtFA65vLW1MpdHF";
export const FEED_ID = "BTC";
export const OTHER_FEED_ID = "ETH";
export const FEED_IDS = [FEED_ID, OTHER_FEED_ID];
export const GRAPHQL_ERROR = "Query timed out";
export const CURSOR = "cursor";
export const TIMESTAMP_ERROR = "Timestamp too old";
export const ADAPTER_MODULE = "price_adapter";
export const WRITE_PRICE_FUNCTION = "try_write_price";
export const PRICE_WRITE_TYPE = `${PACKAGE_ID}::${SUI_PRICE_WRITE_EVENT_FRAGMENT}`;
export const UPDATE_ERROR_TYPE = `${PACKAGE_ID}::${SUI_UPDATE_ERROR_EVENT_FRAGMENT}`;
export const REFERENCE_GAS_PRICE = 1000n;
export const PAYLOAD_BYTES = Uint8Array.from([0x52, 0x45, 0x44, 0x53, 0x54, 0x4f, 0x4e, 0x45]);
export const PAYLOAD_HEX = RedstoneCommon.hexlify(PAYLOAD_BYTES);
export const GAS_SUMMARY = {
  computationCost: "4240000",
  storageCost: "14447600",
  storageRebate: "14303124",
};
export const GAS_SUMMARY_COST = computeSuiGasUsed(GAS_SUMMARY);
const DATA_SERVICE_ID = "redstone-primary-prod";
const UNIQUE_SIGNER_COUNT = 3;
const UpdateErrorEventBcs = bcs.struct("UpdateError", {
  feed_id: bcs.vector(bcs.u8()),
  error: bcs.string(),
});

export function makeParamsProvider(
  dataPackagesIds: string[],
  authenticatedGateways: { url?: string; apiKey: string }[] = []
) {
  return new ContractParamsProvider({
    dataServiceId: DATA_SERVICE_ID,
    uniqueSignersCount: UNIQUE_SIGNER_COUNT,
    dataPackagesIds,
    authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
    authenticatedGateways,
  });
}

export function makeUpdateErrorEvent(feedId: string, error = TIMESTAMP_ERROR) {
  return makeEvent(UPDATE_ERROR_TYPE, feedId, error);
}

export function makePriceWriteEvent(feedId: string, error = TIMESTAMP_ERROR) {
  return makeEvent(PRICE_WRITE_TYPE, feedId, error);
}

export function makeGraphQlInputs(feedId: string) {
  return [
    { kind: "shared" as const, objectId: ADAPTER_OBJECT_ID },
    { kind: "pureBcs" as const, bcsBytes: uint8ArrayToBcs(makeFeedIdBytes(feedId)).toBytes() },
    { kind: "pureBcs" as const, bcsBytes: uint8ArrayToBcs(PAYLOAD_BYTES).toBytes() },
  ];
}

export function makeJsonRpcInputs(feedId: string) {
  return [
    { kind: "shared" as const, objectId: ADAPTER_OBJECT_ID },
    { kind: "pure" as const, rawValue: Buffer.from(makeFeedIdBytes(feedId)).toString() },
    { kind: "pure" as const, rawValue: Array.from(PAYLOAD_BYTES) },
  ];
}

function makeEvent(eventType: string, feedId: string, error: string) {
  return <SuiClientTypes.Event>{
    eventType,
    bcs: UpdateErrorEventBcs.serialize({
      feed_id: Array.from(makeFeedIdBytes(feedId)),
      error,
    }).toBytes(),
  };
}
