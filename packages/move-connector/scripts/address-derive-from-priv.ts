import { PrivateKeyVariants, SigningScheme } from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { makeAptosAccount } from "../src";

function main() {
  const account = makeAptosAccount();
  const variant =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- add reason here, please
    account.signingScheme === SigningScheme.SingleKey
      ? PrivateKeyVariants.Secp256k1
      : PrivateKeyVariants.Ed25519;
  console.log(`${variant} Derived Address: ${account.accountAddress.toString()}`);
  console.log(
    `${variant} Derived Public Key: ${RedstoneCommon.hexlify(account.publicKey.toString())}`
  );
}

main();
