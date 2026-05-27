import {
  EntryFunctionPayloadResponse,
  TransactionPayloadResponse,
  TransactionResponse,
  TransactionResponseType,
  UserTransactionResponse,
} from "@aptos-labs/ts-sdk";
import { MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE } from "@redstone-finance/multichain-kit";

const WRITE_PRICE_FUNCTIONS = ["write_price", "write_prices"];
const PRICE_ADAPTER_MODULE = "price_adapter";
const HEX_PREFIX = "0x";
const PADDED_ADDRESS_LEN = 64;

export function parseMoveWritePriceTx(
  tx: TransactionResponse,
  packageAddress: string,
  blockHeight: number,
  blockTimestamp: number
) {
  if (!isUserTransaction(tx) || !isEntryFunction(tx.payload)) {
    return undefined;
  }
  if (!isWritePriceCall(tx.payload, packageAddress)) {
    return undefined;
  }

  const args = tx.payload.arguments;
  if (args.length !== 3) {
    return undefined;
  }

  return {
    blockNumber: blockHeight,
    blockTimestamp,
    hash: normalizeHex(tx.hash),
    from: normalizeHex(tx.sender),
    to: normalizeHex(args[0] as string),
    data: args[2] as string,
    gasLimit: String(tx.max_gas_amount),
    gasPrice: String(tx.gas_unit_price),
    isFailed: !tx.success,
    gasUsed: Number(tx.gas_used),
    functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  };
}

function isUserTransaction(tx: TransactionResponse): tx is UserTransactionResponse {
  return tx.type === TransactionResponseType.User;
}

function isEntryFunction(
  payload: TransactionPayloadResponse
): payload is EntryFunctionPayloadResponse {
  return "function" in payload;
}

function isWritePriceCall(payload: EntryFunctionPayloadResponse, packageAddress: string) {
  return WRITE_PRICE_FUNCTIONS.map(
    (fn) => `${packageAddress}::${PRICE_ADAPTER_MODULE}::${fn}`
  ).includes(payload.function);
}

function normalizeHex(hex: string) {
  const withPrefix = hex.startsWith(HEX_PREFIX);
  const stripped = withPrefix ? hex.substring(2) : hex;

  return `${withPrefix ? HEX_PREFIX : ""}${stripped.padStart(PADDED_ADDRESS_LEN, "0")}`;
}
