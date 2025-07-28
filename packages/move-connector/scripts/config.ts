import { z } from "zod";

export const MoveNetworkSchema = z.enum([
  "movement-mainnet",
  "movement-testnet",
  "movememt-devnet",
  "aptos-mainnet",
  "aptos-testnet",
  "aptos-devnet",
  "local",
  "custom",
]);
