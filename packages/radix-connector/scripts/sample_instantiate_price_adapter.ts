import { getSignersForDataServiceId } from "@redstone-finance/sdk";
import { PriceAdapterRadixContractDeployer } from "../src";
import {
  DATA_SERVICE_ID,
  loadAddress,
  makeRadixClient,
  PRICE_ADAPTER_NAME,
  saveAddress,
} from "./constants";

async function instantiate() {
  const client = makeRadixClient();
  const connector = new PriceAdapterRadixContractDeployer(
    client,
    await loadAddress(`package`, PRICE_ADAPTER_NAME),
    1,
    getSignersForDataServiceId(DATA_SERVICE_ID),
    [client.getPublicKeyHex()!]
  );

  const componentId = await connector.getComponentId();
  console.log(componentId);

  await saveAddress("component", PRICE_ADAPTER_NAME, componentId);
}

void instantiate();
