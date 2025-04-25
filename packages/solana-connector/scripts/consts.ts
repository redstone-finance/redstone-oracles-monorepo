import { readCluster } from "../src";

const readProgramAddress = () => {
  switch (readCluster()) {
    case "mainnet-beta":
      return "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr";
    case "testnet":
      return "rds8J7VKqLQgzDr7vS59dkQga3B1BotgFy8F7LSLC74";
    case "devnet":
      throw new Error("Program address not available on devnet");
  }
};

export const RDS_PROGRAM_ADDRESS = readProgramAddress();
