import { UniversalSigner } from "@redstone-finance/signing";
import { decodeBase64 } from "../common/base64";

export function deserializeSignature(signatureBase64: string) {
  if (!signatureBase64) {
    throw new Error("Signature can not be empty");
  }

  return UniversalSigner.splitSignature(decodeBase64(signatureBase64));
}
