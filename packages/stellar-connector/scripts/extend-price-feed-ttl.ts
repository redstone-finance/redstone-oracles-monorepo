import { RedstoneCommon } from "@redstone-finance/utils";
import { makeKeypair, PriceFeedStellarContractConnector, StellarClientBuilder } from "../src";
import { loadPriceFeedId, readNetwork, readUrl } from "./utils";

async function main() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const currentTtl = await client.getInstanceTtl(loadPriceFeedId());

  console.log(`Current Ttl: ${RedstoneCommon.stringify(currentTtl)}`);

  const priceFeedConnector = new PriceFeedStellarContractConnector(
    client,
    loadPriceFeedId(),
    keypair
  );

  const adapter = await priceFeedConnector.getAdapter();
  const extendedTtl = await adapter.extendInstanceTtl();

  console.log(`Extended Ttl: ${RedstoneCommon.stringify(extendedTtl)}`);
}

void main().catch((err) => console.log(err));
