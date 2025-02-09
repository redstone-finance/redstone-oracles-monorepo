import { z } from "zod";

export const MovementNetworkSchema = z.enum([
  "mainnet",
  "testnet",
  "localnet",
  "custom",
  "devnet",
]);
export type MovementNetworkName = z.infer<typeof MovementNetworkSchema>;
