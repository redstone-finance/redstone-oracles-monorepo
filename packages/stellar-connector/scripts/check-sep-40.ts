import { Contract } from "@stellar/stellar-sdk";
import { StellarClientBuilder } from "../src";
import { Sep40StellarContractAdapter } from "../src/adapters/Sep40StellarContractAdapter";
import { FEEDS } from "./consts";
import { loadSep40Id, readNetwork, readUrl } from "./utils";

const ASSETS = FEEDS.map((feed) => ({ tag: "Other" as const, symbol: feed }));
const RECORDS = 3;

async function main() {
  const network = readNetwork();
  const client = new StellarClientBuilder()
    .withStellarNetwork(network)
    .withRpcUrl(readUrl())
    .build();

  const sep40Id = loadSep40Id();
  const contract = new Contract(sep40Id);
  const adapter = new Sep40StellarContractAdapter(client, contract);

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
