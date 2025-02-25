import { PrivateKeyVariants, SigningScheme } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { makeAptosAccount } from "../src";

function main() {
  const account = makeAptosAccount();
  const variant =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    account.signingScheme === SigningScheme.SingleKey
      ? PrivateKeyVariants.Secp256k1
      : PrivateKeyVariants.Ed25519;
  console.log(
    `${variant} Derived Address: ${account.accountAddress.toString()}`
  );
  console.log(
    `${variant} Derived Public Key: ${hexlify(account.publicKey.toString())}`
  );
}

main();
