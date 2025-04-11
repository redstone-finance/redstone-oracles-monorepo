import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { ProxyRadixContractDeployer } from "../src";
import {
  FEED_ID,
  loadAddress,
  makeRadixClient,
  PRICE_FEED_NAME,
  PROXY_NAME,
  saveAddress,
} from "./constants";

const THRESHOLD = 2;
const MULTI_SIG_PUBLIC_KEYS = [
  "cd46ef6056caf2630b034fc80920836ceab509425a711a01ebdc0c089218c0bd",
  "9db4fe0c7ef2cd6fff213931369b77cba3459fc05758ea591edfc9a98280d6ba",
  "6b065d9d045e1d67dc3f1515890a731d7e675a7a896f4773c5d7086a81ae24dc",
];

async function instantiate() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);

  const connector = new ProxyRadixContractDeployer(
    client,
    await loadAddress(`package`, PROXY_NAME),
    THRESHOLD,
    MULTI_SIG_PUBLIC_KEYS,
    await loadAddress(`component`, PRICE_FEED_NAME, FEED_ID),
    NetworkId.Stokenet
  );

  const componentId = await connector.getComponentId();
  console.log(componentId);

  await saveAddress(`component`, PROXY_NAME, componentId, FEED_ID);
}

void instantiate();
