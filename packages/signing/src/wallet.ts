import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { BytesLike } from "@ethersproject/bytes";
import {
  addressFromPrivateKey,
  generateKeypair,
  KeyGenerationOptions,
  normalizePrivateKey,
} from "./keys";
import { signEthereumHashMessage } from "./personal-message";
import type { Signature } from "./signature";
import { signTransaction } from "./transaction-signer";
import type { TypedDataDomain, TypedDataField } from "./typed-data";
import { signTypedData } from "./typed-data";
import { UniversalSigner } from "./UniversalSigner";

export interface Wallet {
  readonly address: string;
  readonly privateKey: string;
  getAddress: () => Promise<string>;
  signDigest: (digest: BytesLike) => Signature;
  signMessage: (message: BytesLike) => string;
  signTypedData: (
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ) => Promise<string>;
  signTransaction: (transaction: TransactionRequest) => Promise<string>;
}

export function createWallet(rawPrivateKey: string): Wallet {
  const privateKey = normalizePrivateKey(rawPrivateKey);
  const address = addressFromPrivateKey(privateKey);

  return Object.freeze({
    address,
    privateKey,
    getAddress: () => Promise.resolve(address),
    signDigest: (digest: BytesLike) => UniversalSigner.signDigest(digest, privateKey),
    signMessage: (message: BytesLike) => signEthereumHashMessage(message, privateKey),
    signTypedData: (
      domain: TypedDataDomain,
      types: Record<string, TypedDataField[]>,
      value: Record<string, unknown>
    ) => signTypedData(domain, types, value, privateKey),
    signTransaction: (transaction: TransactionRequest) => signTransaction(transaction, privateKey),
  });
}

export function createRandomWallet(options?: KeyGenerationOptions) {
  return createWallet(generateKeypair(options).privateKey);
}
