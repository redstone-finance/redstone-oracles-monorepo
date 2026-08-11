import { arrayify, BytesLike, joinSignature } from "@ethersproject/bytes";
import { hashMessage } from "@ethersproject/hash";
import { SigningKey } from "@ethersproject/signing-key";

export function signEthereumHashMessage(message: BytesLike, privateKey: string) {
  const digest = arrayify(hashMessage(message));

  return joinSignature(new SigningKey(privateKey).signDigest(digest));
}
