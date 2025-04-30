import { PublicKey } from "@solana/web3.js";
import { getMarkdownTable } from "markdown-table-ts";
import { readProgramAddress } from "./consts";

type Env = "devnet" | "testnet" | "mainnet-beta";

const makeFeedIdBytes = (feedId: string) => {
  return Buffer.from(feedId.padEnd(32, "\0"));
};

const makePriceSeed = () => {
  return Buffer.from("price".padEnd(32, "\0"));
};

function feedAddress(programId: string, feed: string) {
  const seeds = [makePriceSeed(), makeFeedIdBytes(feed)];

  return PublicKey.findProgramAddressSync(
    seeds,
    new PublicKey(programId)
  )[0].toBase58();
}

function makeFeedTable(feedIds: string[]) {
  const envs: Env[] = ["mainnet-beta", "testnet", "devnet"];
  const body = [];
  for (const feed of feedIds) {
    const addresses = envs.map((env) =>
      feedAddress(readProgramAddress(env), feed)
    );

    body.push([feed].concat(addresses));
  }

  const table = getMarkdownTable({
    table: {
      head: [""].concat(envs),
      body,
    },
  });
  console.log(table);
}

void makeFeedTable([
  "ETH",
  "BTC",
  "BUIDL_SOLANA_FUNDAMENTAL",
  "BUIDL_SOLANA_DAILY_ACCRUAL",
  "ACRED_SOLANA_FUNDAMENTAL",
]);
