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
  "609775fbf61f4b59562c394359f661e4559c654e63a776de7c23f590e7602988",
  "b7f48ccce7f2aea73282dcd3cf70aeb9541acdcc1291525d4180c1f08977099a",
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
