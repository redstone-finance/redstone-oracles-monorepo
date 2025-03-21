import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { TransferXRDRadixMethod } from "../src/methods/TransferXRDRadixMethod";
import { makeRadixClient, NETWORK, PRIVATE_KEY } from "./constants";

async function transfer(toAddress: string, amount: number) {
  if (!PRIVATE_KEY) {
    throw new Error("No PRIVATE_KEY is defined in the .env file");
  }
  const client = makeRadixClient();

  const addressBook = await RadixEngineToolkit.Utils.knownAddresses(NETWORK.id);
  const fromAddress = await client.getAccountAddress();

  await client.call(
    new TransferXRDRadixMethod(
      fromAddress,
      toAddress,
      addressBook.resourceAddresses.xrd,
      amount
    )
  );
}

async function main() {
  await transfer(
    "account_rdx1687dkg4a7v7qmhrad347kt5zrpsmpnqzcafuq9lzzau98l357hqqr7",
    10
  );
}

void main();
