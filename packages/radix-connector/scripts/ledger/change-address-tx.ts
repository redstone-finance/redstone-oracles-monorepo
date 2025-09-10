import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { z } from "zod";
import { RadixClient } from "../../src";
import { SetGlobalContractAddressInvocationMethod } from "../../src/contracts/proxy/methods/SetGlobalContractAddressInvocationMethod";
import { FEED_ID, loadAddress, makeRadixClient, PRICE_FEED_NAME, PROXY_NAME } from "../constants";

export async function getTx(client: RadixClient) {
  const address = await loadAddress(`component`, PRICE_FEED_NAME, FEED_ID);
  const componentId = await loadAddress(`component`, PROXY_NAME, FEED_ID);
  const invocation = new SetGlobalContractAddressInvocationMethod(componentId, address);

  return invocation.getDedicatedTransaction(await client.getAccountAddress());
}

async function changeProxyAddressTx() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);
  const tx = await getTx(client);

  const intent = await client.compileTransactionToIntent(tx);
  console.log(await RadixEngineToolkit.Intent.decompile(intent, "String"));

  console.log(hexlify(intent));
}

void changeProxyAddressTx();
