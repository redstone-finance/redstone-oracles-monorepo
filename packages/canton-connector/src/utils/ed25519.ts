import { createPrivateKey, createPublicKey } from "node:crypto";

// PKCS#8 DER header for Ed25519 (RFC 8410)
const ED25519_PKCS8_DER_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export function makeEd25519PrivateKey(privateKeyHex: string) {
  const hex = privateKeyHex.replace(/^0x/i, "");
  const pkcs8 = Buffer.concat([ED25519_PKCS8_DER_PREFIX, Buffer.from(hex, "hex")]);

  return createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
}

export function ed25519PublicKeyHex(privateKeyHex: string): string {
  const privateKey = makeEd25519PrivateKey(privateKeyHex);
  const spkiDer = createPublicKey(privateKey).export({ format: "der", type: "spki" }) as Buffer;

  // Raw Ed25519 public key = last 32 bytes of SPKI DER
  return spkiDer.subarray(-32).toString("hex");
}
