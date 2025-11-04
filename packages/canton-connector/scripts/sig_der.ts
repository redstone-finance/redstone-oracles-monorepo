import { arrayify, hexlify } from "ethers/lib/utils";
import * as secp from "secp256k1";

function toDER(sig: Uint8Array): Uint8Array {
  return secp.signatureExport(sig);
}

function main() {
  const sig =
    "a40f92c0d2912df895a1cbd44b001b77215ea67e3091f7fa743590192209e7ee166a29748b68e92c84bdad0afe3f51511ad9803e65ed3e376f2373f538b557e0";
  console.log(hexlify(toDER(arrayify(sig, { allowMissingPrefix: true }))));
}

void main();
