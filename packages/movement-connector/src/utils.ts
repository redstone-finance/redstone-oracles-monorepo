import {
  Account,
  Ed25519PrivateKey,
  HexInput,
  MoveVector,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
  TransactionResponse,
  TransactionResponseType,
  U8,
} from "@aptos-labs/ts-sdk";
import { MOVE_DECIMALS } from "./consts";

export function makeFeedIdBytes(feedId: string): Uint8Array {
  return Uint8Array.from(Buffer.from(feedId.padEnd(32, "\0")));
}

export function feedIdHexToMoveVector(hex: string): MoveVector<U8> {
  return hex.startsWith("0x") ? MoveVector.U8(hex) : MoveVector.U8(`0x${hex}`);
}

export function octasToMove(octas: number) {
  return octas / 10 ** MOVE_DECIMALS;
}

export function txCost(response: TransactionResponse) {
  if (response.type === TransactionResponseType.Pending) {
    return 0;
  }

  const gas_used = +response.gas_used;

  if (!("gas_unit_price" in response)) {
    return octasToMove(gas_used);
  }

  const gas_price = +response.gas_unit_price;

  return octasToMove(gas_price * gas_used);
}

export function makeAccountFromSecp256k1Key(privateKey: string): Account {
  return Account.fromPrivateKey({
    privateKey: extractPrivateKey(privateKey, PrivateKeyVariants.Secp256k1),
  });
}

function extractPrivateKey(
  key: HexInput,
  keyType: PrivateKeyVariants
): Ed25519PrivateKey | Secp256k1PrivateKey {
  switch (keyType) {
    case PrivateKeyVariants.Ed25519:
      return new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(key, PrivateKeyVariants.Ed25519)
      );
    case PrivateKeyVariants.Secp256k1:
      return new Secp256k1PrivateKey(
        PrivateKey.formatPrivateKey(key, PrivateKeyVariants.Secp256k1)
      );
  }
}
