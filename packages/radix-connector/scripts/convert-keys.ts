import { Wallet } from "ethers";
import { arrayify, hexlify } from "ethers/lib/utils";
import { publicKeyConvert } from "secp256k1";
import { makeRadixClient, NETWORK, PRIVATE_KEY } from "./constants";

async function main() {
  if (!PRIVATE_KEY) {
    throw new Error("No PRIVATE_KEY is defined in the .env file");
  }
  const client = makeRadixClient();

  console.log("Scheme:", PRIVATE_KEY.scheme);
  console.log("Network Id:", NETWORK.id);
  console.log("Radix Public Key:", client.getPublicKeyHex());
  console.log("Radix Account Address:", await client.getAccountAddress());

  const wallet = new Wallet(PRIVATE_KEY.value);
  console.log("EVM Uncompressed Public Key:", wallet.publicKey);
  const uncompressedPublicKey = hexlify(
    publicKeyConvert(arrayify(wallet.publicKey), true)
  ).substring(2);
  console.log("EVM Compressed Public Key:", uncompressedPublicKey);

  console.log(
    `Radix Public Key and EVM Compressed public key ${(await client.getPublicKeyHex()) === uncompressedPublicKey ? "are EQUAL <3" : "are NOT equal ;("}`
  );
}

/// Use the following to determine the Radix address from a given EVM public key:
/// return await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(publicKey, networkId)

void main();
