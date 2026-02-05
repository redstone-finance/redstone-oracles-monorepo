import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr");
const FEED_ID = process.argv[2];

const makeFeedIdBytes = (feedId: string) => {
  return Buffer.from(feedId.padEnd(32, "\0"));
};

const makePriceSeed = () => {
  return Buffer.from("price".padEnd(32, "\0"));
};

const main = () => {
  const seeds = [makePriceSeed(), makeFeedIdBytes(FEED_ID)];
  const address = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
  console.log(`Address of ${FEED_ID} price feed:`, address.toString());
};

main();
