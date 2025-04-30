export const readProgramAddress = (
  cluster: "mainnet-beta" | "testnet" | "devnet"
) => {
  switch (cluster) {
    case "mainnet-beta":
      return "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr";
    case "testnet":
      return "rds8J7VKqLQgzDr7vS59dkQga3B1BotgFy8F7LSLC74";
    case "devnet":
      return "REDuYsnEucMweattdv4xQCYdU1i8Q2W92kdayrpY9rA";
  }
};
