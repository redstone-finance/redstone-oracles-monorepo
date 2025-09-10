import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { ProxyRadixContractConnector } from "../src";
import { FEED_ID, loadAddress, makeRadixClient, PRICE_FEED_NAME, PROXY_NAME } from "./constants";

async function changeProxyAddress() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);

  const connector = new ProxyRadixContractConnector(
    client,
    await loadAddress(`component`, PROXY_NAME, FEED_ID)
  );

  const adapter = await connector.getAdapter();
  await adapter.setContractGlobalAddress(await loadAddress(`component`, PRICE_FEED_NAME, FEED_ID));
}

void changeProxyAddress();
