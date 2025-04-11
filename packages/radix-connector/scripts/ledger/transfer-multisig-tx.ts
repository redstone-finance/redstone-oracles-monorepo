import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { z } from "zod";
import { RadixClient } from "../../src";
import { SetRolaRadixInvocation } from "../../src/contracts/proxy/methods/ChangeManagerRole";
import { makeMultisigAccessRule } from "../../src/radix/utils";
import {
  FEED_ID,
  loadAddress,
  makeRadixClient,
  PROXY_NAME,
} from "../constants";

const THRESHOLD = 2;
const MULTI_SIG_PUBLIC_KEYS = [""];

export async function getTx(client: RadixClient, networkId: number) {
  const componentId = await loadAddress(`component`, PROXY_NAME, FEED_ID);
  const invocation = new SetRolaRadixInvocation(
    componentId,
    "proxy_man_auth",
    await makeMultisigAccessRule(THRESHOLD, MULTI_SIG_PUBLIC_KEYS, networkId)
  );

  return invocation.getDedicatedTransaction(await client.getAccountAddress());
}

async function transferMultiSig() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);
  const tx = await getTx(client, networkId);

  const intent = await client.compileTransactionToIntent(tx);
  console.log(await RadixEngineToolkit.Intent.decompile(intent, "String"));

  console.log(hexlify(intent));
}

void transferMultiSig();
