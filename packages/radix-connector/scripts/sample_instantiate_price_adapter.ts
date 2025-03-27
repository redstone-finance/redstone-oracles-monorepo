import { getSignersForDataServiceId } from "@redstone-finance/sdk";
import { PriceAdapterRadixContractDeployer, RadixClient } from "../src";
import { TransferNonFungibleRadixMethod } from "../src/methods/TransferNonFungibleRadixMethod";
import {
  DATA_SERVICE_ID,
  loadAddress,
  makeRadixClient,
  PRICE_ADAPTER_NAME,
  saveAddress,
  TRUSTED_UPDATERS,
} from "./constants";

async function instantiate() {
  const client = makeRadixClient();
  const connector = new PriceAdapterRadixContractDeployer(
    client,
    await loadAddress(`package`, PRICE_ADAPTER_NAME),
    1,
    getSignersForDataServiceId(DATA_SERVICE_ID),
    TRUSTED_UPDATERS
  );

  const componentId = await connector.getComponentId();
  console.log(componentId);

  await saveAddress("component", PRICE_ADAPTER_NAME, componentId);
  await distributeTrustedUpdaterBadges(connector, TRUSTED_UPDATERS, client);
}

async function distributeTrustedUpdaterBadges(
  connector: PriceAdapterRadixContractDeployer,
  trustedUpdaters: string[],
  client: RadixClient
) {
  console.log(`Trusted updaters: ${trustedUpdaters.toString()}`);
  const priceAdapter = await connector.getAdapter();
  for (const updater of trustedUpdaters) {
    const badge = await priceAdapter.getTrustedUpdaterResourceBadge(updater);
    if (!badge) {
      continue;
    }

    await client.call(
      new TransferNonFungibleRadixMethod(
        await client.getAccountAddress(),
        updater,
        badge
      )
    );
  }
}

void instantiate();
