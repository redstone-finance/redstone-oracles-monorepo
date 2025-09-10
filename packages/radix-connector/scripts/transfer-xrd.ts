import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { TransferXRDRadixMethod } from "../src/methods/TransferXRDRadixMethod";
import { makeRadixClient, NETWORK, NETWORK_ID, PRIVATE_KEY } from "./constants";

async function transfer(toAddress: string, amount: number) {
  if (!PRIVATE_KEY) {
    throw new Error("No PRIVATE_KEY is defined in the .env file");
  }
  const client = makeRadixClient(NETWORK_ID);

  const addressBook = await RadixEngineToolkit.Utils.knownAddresses(NETWORK.id);
  const fromAddress = await client.getAccountAddress();

  await client.call(
    new TransferXRDRadixMethod(fromAddress, toAddress, addressBook.resourceAddresses.xrd, amount)
  );
}

async function main() {
  await transfer("account_rdx16xrpmhnzphjdpcd326wz42wdxyf28t9j2e4axn6t8p4au2vrgrdtxp", 100);
}

void main();
