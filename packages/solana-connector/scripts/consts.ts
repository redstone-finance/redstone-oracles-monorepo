import { PublicKey } from "@solana/web3.js";

export const readProgramAddress = (cluster: "mainnet-beta" | "testnet" | "devnet") => {
  switch (cluster) {
    case "mainnet-beta":
      return "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr";
    case "testnet":
      return "rds8J7VKqLQgzDr7vS59dkQga3B1BotgFy8F7LSLC74";
    case "devnet":
      return "REDuYsnEucMweattdv4xQCYdU1i8Q2W92kdayrpY9rA";
  }
};

export const BPF_UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

export const PROGRAM_SO_FILE = "target/deploy/redstone_solana_price_adapter.so";
