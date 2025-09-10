import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { ProxyRadixContractConnector } from "../src";
import { makeMultisigAccessRule } from "../src/radix/utils";
import { FEED_ID, loadAddress, makeRadixClient, PROXY_NAME } from "./constants";

async function changeProxyManager() {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);

  const connector = new ProxyRadixContractConnector(
    client,
    await loadAddress(`component`, PROXY_NAME, FEED_ID)
  );

  const adapter = await connector.getAdapter();
  await adapter.changeManagerAccessRule(
    await makeMultisigAccessRule(1, [client.getNotarySigner()!.publicKeyHex()], networkId)
  );
}

void changeProxyManager();
