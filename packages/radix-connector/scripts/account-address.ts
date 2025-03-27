import { PublicKey, RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { arrayify, hexlify } from "ethers/lib/utils";
import { publicKeyConvert } from "secp256k1";
import { z } from "zod";
import {} from "./constants";

export async function pkToAddress(
  publicKeyHex: string,
  scheme: "secp256k1" | "ed25519",
  networkId: number
) {
  const bytes = publicKeyConvert(arrayify(publicKeyHex), true);
  console.log(`Public key hex: ${hexlify(bytes)}`);
  const pk =
    scheme === "secp256k1"
      ? new PublicKey.Secp256k1(bytes)
      : new PublicKey.Ed25519(bytes);

  return await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
    pk,
    networkId
  );
}

async function main() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const args = process.argv.slice(2);
  const publicKey = args[0];
  const scheme = (args[1] ?? "secp256k1") as "secp256k1" | "ed25519";

  const radixAddress = await pkToAddress(publicKey, scheme, networkId);

  console.log(`Radix address ${radixAddress}`);
}

void main();
