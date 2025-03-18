import { PriceFeedRadixContractDeployer } from "../src";
import {
  FEED_ID,
  loadAddress,
  makeRadixClient,
  PRICE_ADAPTER_NAME,
  PRICE_FEED_NAME,
  saveAddress,
} from "./constants";

async function instantiate() {
  const client = makeRadixClient();

  const connector = new PriceFeedRadixContractDeployer(
    client,
    await loadAddress(`package`, PRICE_FEED_NAME),
    await loadAddress(`component`, PRICE_ADAPTER_NAME),
    FEED_ID
  );

  const componentId = await connector.getComponentId();
  console.log(componentId);

  await saveAddress(`component`, PRICE_FEED_NAME, componentId, FEED_ID);
}

void instantiate();
