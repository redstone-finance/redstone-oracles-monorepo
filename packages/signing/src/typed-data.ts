import type { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { Wallet } from "@ethersproject/wallet";

export type { TypedDataDomain, TypedDataField };

export function hashTypedData(
  domain: TypedDataDomain,
  types: Record<string, TypedDataField[]>,
  value: Record<string, unknown>
) {
  return _TypedDataEncoder.hash(domain, types, value);
}

export function signTypedData(
  domain: TypedDataDomain,
  types: Record<string, TypedDataField[]>,
  value: Record<string, unknown>,
  privateKey: string
) {
  return new Wallet(privateKey)._signTypedData(domain, types, value);
}
