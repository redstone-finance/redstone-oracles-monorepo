import {
  Account,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
} from "@aptos-labs/ts-sdk";

function main() {
  const scriptArgs = process.argv.slice(2);
  if (!scriptArgs.length) {
    console.error(
      `Please provide the private key in secp256k1 format as a hex string.`
    );
  }
  const account = Account.fromPrivateKey({
    privateKey: new Secp256k1PrivateKey(
      PrivateKey.formatPrivateKey(scriptArgs[0], PrivateKeyVariants.Secp256k1)
    ),
  });
  console.log(`Derived Address is: [ ${account.accountAddress.toString()} ]`);
}

void main();
