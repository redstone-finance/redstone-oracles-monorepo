import { Network } from "@aptos-labs/ts-sdk";
import { z } from "zod";
import { TransactionConfig } from "./types";

export const MovementNetworkSchema = z.enum([
  "mainnet",
  "testnet",
  "local",
  "custom",
  "devnet",
]);
export type MovementNetworkName = z.infer<typeof MovementNetworkSchema>;

export function movementNetworkSchemaToAptosNetwork(
  networkName?: MovementNetworkName
): Network {
  if (networkName?.includes("testnet") || networkName?.includes("custom")) {
    return Network.CUSTOM;
  }
  if (networkName?.includes("devnet")) {
    return Network.DEVNET;
  }
  if (networkName?.includes("mainnet")) {
    return Network.MAINNET;
  }

  return Network.LOCAL;
}

export const TRANSACTION_DEFAULT_CONFIG: TransactionConfig = {
  writePriceOctasTxGasBudget: 100_000_000,
  maxTxSendAttempts: 5,
};

export function configFromOptionals(
  writePriceOctasTxGasBudgetOptional?: number,
  maxTxSendAttemptsOptional?: number
) {
  const writePriceOctasTxGasBudget =
    writePriceOctasTxGasBudgetOptional ??
    TRANSACTION_DEFAULT_CONFIG.writePriceOctasTxGasBudget;
  const maxTxSendAttempts =
    maxTxSendAttemptsOptional ?? TRANSACTION_DEFAULT_CONFIG.maxTxSendAttempts;

  return {
    writePriceOctasTxGasBudget,
    maxTxSendAttempts,
  };
}
