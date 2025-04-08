export interface PrivateKey {
  scheme: "secp256k1" | "ed25519";
  value: string;
}
