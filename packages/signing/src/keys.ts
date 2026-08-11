import { BytesLike } from "@ethersproject/bytes";
import { SigningKey } from "@ethersproject/signing-key";
import { computeAddress } from "@ethersproject/transactions";
import { Wallet } from "@ethersproject/wallet";

export type Keypair = {
  privateKey: string;
  publicKey: string;
  address: string;
};

export type KeyGenerationOptions = {
  extraEntropy?: BytesLike;
};

const UNPREFIXED_PRIVATE_KEY_REGEXP = /^[0-9a-f]{64}$/i;

export function normalizePrivateKey(privateKey: string) {
  return UNPREFIXED_PRIVATE_KEY_REGEXP.test(privateKey) ? `0x${privateKey}` : privateKey;
}

export function publicKeyFromPrivateKey(privateKey: string) {
  return new SigningKey(privateKey).publicKey;
}

export function addressFromPrivateKey(privateKey: string) {
  return computeAddress(publicKeyFromPrivateKey(privateKey));
}

export function generateKeypair(options?: KeyGenerationOptions): Keypair {
  const { privateKey, publicKey, address } = Wallet.createRandom(options);

  return { privateKey, publicKey, address };
}
