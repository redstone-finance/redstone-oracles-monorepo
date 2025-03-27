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
const MULTI_SIG_PUBLIC_KEYS = [""]; // ed public keys hex without 0x prefix

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
