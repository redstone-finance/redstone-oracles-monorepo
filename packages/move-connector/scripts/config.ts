import { z } from "zod";

export const MoveNetworkSchema = z.enum([
  "movement-mainnet",
  "movement-testnet",
  "movement-devnet",
  "aptos-mainnet",
  "aptos-testnet",
  "aptos-devnet",
  "local",
  "custom",
]);
export type MoveNetwork = z.infer<typeof MoveNetworkSchema>;

export function isAptos(network: MoveNetwork) {
  return network.startsWith("aptos") || network === "local";
}

export function isMovement(network: MoveNetwork) {
  return network.startsWith("movement");
}

export function isCustom(network: MoveNetwork) {
  return !isAptos(network) && !isMovement(network);
}
