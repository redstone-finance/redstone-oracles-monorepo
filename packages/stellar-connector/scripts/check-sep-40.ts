import { readFromContractAdapter } from "@redstone-finance/multichain-kit";
import { Sep40StellarContractAdapter, StellarClientBuilder } from "../src";
import { OTHER_ASSET } from "../src/sep-40-types";
import { FEEDS as BASE_FEEDS } from "./consts";
import { loadSep40Id, readNetwork, readUrl } from "./utils";

const FEEDS = [...BASE_FEEDS, "__MISSING_FEED__"];
const ASSETS = FEEDS.map((feed) => ({ tag: OTHER_ASSET, symbol: feed }));
const RECORDS = 3;

async function main() {
  const network = readNetwork();
  const client = new StellarClientBuilder()
    .withStellarNetwork(network)
    .withRpcUrl(readUrl())
    .withMulticall()
    .build();

  const sep40Id = loadSep40Id();
  const priceAdapter = new Sep40StellarContractAdapter(client, sep40Id);

  await readFromContractAdapter(priceAdapter, BASE_FEEDS);

  const adapter = priceAdapter.reader;

  console.log(`\nSEP-40 contract: ${sep40Id}\n`);

  const base = await adapter.base();
  console.log(`base asset:`, base);

  const assets = await adapter.assets();
  console.log(`assets:`, assets);

  const decimals = await adapter.decimals();
  console.log(`decimals: ${decimals}`);

  const resolution = await adapter.resolution();
  console.log(`resolution: ${resolution}s`);

  for (const asset of ASSETS) {
    console.log(`\n--- ${asset.symbol} ---`);

    const last = await adapter.lastprice(asset);
    if (last) {
      console.log(`lastprice: ${last.price} @ ${last.timestamp}`);
    } else {
      console.log(`lastprice: none`);
    }

    const records = await adapter.prices(asset, RECORDS);
    if (records) {
      console.log(`prices (last ${RECORDS}):`);
      for (const pd of records) {
        console.log(`  ${pd.price} @ ${pd.timestamp}`);
      }
    } else {
      console.log(`prices: none`);
    }

    if (last) {
      const exact = await adapter.price(asset, last.timestamp);
      if (exact) {
        console.log(`price @ ${last.timestamp}: ${exact.price}`);
      } else {
        console.log(`price @ ${last.timestamp}: none`);
      }
    }
  }

  console.log(`\n--- TTL ---`);
  console.dir(await adapter.getEntryTtls());
}

void main().catch(console.error);
